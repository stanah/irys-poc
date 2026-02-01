import { Livepeer } from "livepeer";
import * as tus from "tus-js-client";
import { getEnv } from "./config";
import type {
  LivepeerAsset,
  LivepeerUploadResponse,
  HLSManifest,
  HLSSegment,
} from "@/types/video";

/**
 * LivepeerService - Handles video transcoding via Livepeer Studio API
 */
export class LivepeerService {
  private client: Livepeer | null = null;

  private getClient(): Livepeer {
    if (!this.client) {
      const apiKey = getEnv().livepeerApiKey;
      if (!apiKey) {
        throw new Error("Livepeer API key is not configured");
      }
      this.client = new Livepeer({ apiKey });
    }
    return this.client;
  }

  /**
   * Create a new asset and get upload URL for resumable upload
   * @param name Asset name (usually video title)
   * @returns Upload URL and asset ID
   */
  async createAsset(name: string): Promise<LivepeerUploadResponse> {
    const client = this.getClient();

    const response = await client.asset.create({
      name,
      storage: {
        ipfs: false, // We use Irys instead
      },
      playbackPolicy: {
        type: "public",
      },
    } as any);

    if (!response.data?.asset?.id) {
      throw new Error("Failed to create Livepeer asset");
    }

    const asset = response.data.asset;
    const tusEndpoint = response.data.tusEndpoint;

    if (!tusEndpoint) {
      throw new Error("No TUS endpoint provided");
    }

    return {
      assetId: asset.id,
      uploadUrl: tusEndpoint,
      tusEndpoint,
      task: response.data.task ? { id: response.data.task.id } : undefined,
    };
  }

  /**
   * Upload video file using TUS resumable upload protocol
   * @param file Video file to upload
   * @param tusEndpoint TUS endpoint URL
   * @param onProgress Progress callback
   * @returns Promise that resolves when upload is complete
   */
  async uploadWithTus(
    file: File,
    tusEndpoint: string,
    onProgress?: (percentage: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: tusEndpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          onProgress?.(percentage);
        },
        onSuccess: () => {
          resolve();
        },
      });

      upload.start();
    });
  }

  /**
   * Get asset details including transcode status
   * @param assetId Livepeer asset ID
   */
  async getAsset(assetId: string): Promise<LivepeerAsset> {
    const client = this.getClient();
    const response = await client.asset.get(assetId);

    if (!response.asset) {
      throw new Error("Asset not found");
    }

    const asset = response.asset;

    return {
      id: asset.id,
      playbackId: asset.playbackId || "",
      status: {
        phase: this.mapPhase(asset.status?.phase),
        errorMessage: asset.status?.errorMessage,
        progress: asset.status?.progress,
      },
      playbackUrl: asset.playbackUrl,
      downloadUrl: asset.downloadUrl,
    };
  }

  /**
   * Wait for asset to be ready (transcoding complete)
   * @param assetId Livepeer asset ID
   * @param onProgress Progress callback
   * @param maxWaitMs Maximum wait time in milliseconds
   */
  async waitForReady(
    assetId: string,
    onProgress?: (status: LivepeerAsset["status"]) => void,
    maxWaitMs: number = 600000 // 10 minutes
  ): Promise<LivepeerAsset> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const asset = await this.getAsset(assetId);
      onProgress?.(asset.status);

      if (asset.status.phase === "ready") {
        return asset;
      }

      if (asset.status.phase === "failed") {
        throw new Error(
          `Transcode failed: ${asset.status.errorMessage || "Unknown error"}`
        );
      }

      await this.sleep(pollInterval);
    }

    throw new Error("Transcode timeout");
  }

  /**
   * Download HLS manifest and segments from Livepeer
   * @param playbackId Livepeer playback ID
   */
  async downloadHlsManifest(playbackId: string): Promise<HLSManifest> {
    const baseUrl = `https://livepeer.studio/api/playback/${playbackId}`;

    // Get playback info
    const infoResponse = await fetch(baseUrl);
    if (!infoResponse.ok) {
      throw new Error("Failed to get playback info");
    }

    const playbackInfo = await infoResponse.json();
    const hlsUrl = playbackInfo.meta?.source?.[0]?.hrn === "HLS (TS)"
      ? playbackInfo.meta?.source?.[0]?.url
      : null;

    if (!hlsUrl) {
      throw new Error("HLS URL not available");
    }

    // Fetch master playlist
    const masterResponse = await fetch(hlsUrl);
    if (!masterResponse.ok) {
      throw new Error("Failed to fetch master playlist");
    }

    const masterPlaylist = await masterResponse.text();
    const renditions = await this.parseAndFetchRenditions(hlsUrl, masterPlaylist);

    return {
      masterPlaylist,
      renditions,
    };
  }

  /**
   * Parse HLS master playlist and fetch all rendition playlists with segments
   */
  private async parseAndFetchRenditions(
    baseUrl: string,
    masterPlaylist: string
  ): Promise<HLSManifest["renditions"]> {
    const lines = masterPlaylist.split("\n");
    const renditions: HLSManifest["renditions"] = [];
    const baseUrlPath = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);

    let currentBandwidth = 0;
    let currentQuality = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("#EXT-X-STREAM-INF:")) {
        // Parse stream info
        const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
        const resolutionMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);

        if (bandwidthMatch) {
          currentBandwidth = parseInt(bandwidthMatch[1]);
        }

        if (resolutionMatch) {
          const height = parseInt(resolutionMatch[2]);
          currentQuality = this.heightToQuality(height);
        }
      } else if (line && !line.startsWith("#") && currentQuality) {
        // This is a playlist URL
        const playlistUrl = line.startsWith("http")
          ? line
          : baseUrlPath + line;

        const { playlist, segments } = await this.fetchPlaylistAndSegments(
          playlistUrl
        );

        renditions.push({
          quality: currentQuality,
          bandwidth: currentBandwidth,
          playlist,
          segments,
        });

        currentQuality = "";
        currentBandwidth = 0;
      }
    }

    return renditions;
  }

  /**
   * Fetch a rendition playlist and its segments
   */
  private async fetchPlaylistAndSegments(
    playlistUrl: string
  ): Promise<{ playlist: string; segments: HLSSegment[] }> {
    const response = await fetch(playlistUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${playlistUrl}`);
    }

    const playlist = await response.text();
    const segments: HLSSegment[] = [];
    const baseUrlPath = playlistUrl.substring(0, playlistUrl.lastIndexOf("/") + 1);
    const lines = playlist.split("\n");

    let currentDuration = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("#EXTINF:")) {
        const durationMatch = trimmed.match(/#EXTINF:([\d.]+)/);
        if (durationMatch) {
          currentDuration = parseFloat(durationMatch[1]);
        }
      } else if (trimmed && !trimmed.startsWith("#") && currentDuration > 0) {
        // This is a segment URL
        const segmentUrl = trimmed.startsWith("http")
          ? trimmed
          : baseUrlPath + trimmed;

        // Fetch segment data
        const segmentResponse = await fetch(segmentUrl);
        if (!segmentResponse.ok) {
          throw new Error(`Failed to fetch segment: ${segmentUrl}`);
        }

        const data = await segmentResponse.arrayBuffer();

        segments.push({
          uri: trimmed,
          duration: currentDuration,
          data,
        });

        currentDuration = 0;
      }
    }

    return { playlist, segments };
  }

  /**
   * Map Livepeer status phase to our type
   */
  private mapPhase(
    phase?: string
  ): "waiting" | "processing" | "ready" | "failed" {
    switch (phase) {
      case "waiting":
        return "waiting";
      case "uploading":
      case "processing":
        return "processing";
      case "ready":
        return "ready";
      case "failed":
        return "failed";
      default:
        return "waiting";
    }
  }

  /**
   * Convert height to quality string
   */
  private heightToQuality(height: number): string {
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    return "360p";
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const livepeerService = new LivepeerService();
