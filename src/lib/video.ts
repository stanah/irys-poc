import { livepeerService } from "./livepeer";
import { irysService } from "./irys";
import { litService } from "./lit";
import { encryptHlsManifest, generateAccessControlConditions } from "./encryption";
import { getEnv } from "./config";
import { createPublicClient, http, keccak256, toBytes, type WalletClient } from "viem";
import { polygonAmoy } from "viem/chains";
import { VIDEO_TIPPING_ABI, getTippingContractAddress } from "@/types/contracts";
import type {
  VideoMetadata,
  UploadVideoParams,
  UploadProgress,
  VideoQueryParams,
  VideoListItem,
  AccessControlCondition,
  EncryptedSegment,
} from "@/types/video";

/**
 * VideoService - Orchestrates the complete video upload and retrieval pipeline
 */
export class VideoService {
  /**
   * Complete video upload pipeline:
   * 1. Upload to Livepeer for transcoding
   * 2. Wait for transcoding to complete
   * 3. Download HLS segments
   * 4. Encrypt segments with Lit Protocol
   * 5. Store encrypted segments and metadata on Irys
   */
  async uploadVideo(
    params: UploadVideoParams,
    walletClient: WalletClient,
    address: string,
    onProgress: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      // Stage 1: Prepare
      onProgress({
        stage: "preparing",
        percentage: 0,
        message: "Preparing upload...",
      });

      // Create Livepeer asset
      const createResult = await livepeerService.createAsset(params.title);
      if (!createResult.success) throw new Error(createResult.error.message);
      const { assetId, tusEndpoint } = createResult.data;

      // Stage 2: Upload to Livepeer
      onProgress({
        stage: "uploading",
        percentage: 0,
        message: "Uploading video...",
      });

      const uploadResult = await livepeerService.uploadWithTus(params.file, tusEndpoint, (pct) => {
        onProgress({
          stage: "uploading",
          percentage: pct,
          message: `Uploading: ${pct}%`,
        });
      });
      if (!uploadResult.success) throw new Error(uploadResult.error.message);

      // Stage 3: Wait for transcoding
      onProgress({
        stage: "transcoding",
        percentage: 0,
        message: "Transcoding video...",
      });

      const readyResult = await livepeerService.waitForReady(assetId, (status) => {
        const pct = status.progress ?? 0;
        onProgress({
          stage: "transcoding",
          percentage: Math.round(pct * 100),
          message: `Transcoding: ${Math.round(pct * 100)}%`,
        });
      });
      if (!readyResult.success) throw new Error(readyResult.error.message);
      const asset = readyResult.data;

      // Stage 4: Download HLS manifest and segments
      onProgress({
        stage: "encrypting",
        percentage: 0,
        message: "Downloading transcoded video...",
      });

      const hlsResult = await livepeerService.downloadHlsManifest(
        asset.playbackId
      );
      if (!hlsResult.success) throw new Error(hlsResult.error.message);
      const hlsManifest = hlsResult.data;

      // Generate access control conditions
      const accessControlConditions =
        params.accessControlConditions ||
        generateAccessControlConditions(params.accessType, {
          creatorAddress: address,
        });

      // Stage 5: Encrypt segments
      onProgress({
        stage: "encrypting",
        percentage: 10,
        message: "Encrypting video segments...",
      });

      const { encryptedRenditions, authSig } = await encryptHlsManifest(
        hlsManifest,
        accessControlConditions,
        walletClient,
        address,
        (current, total) => {
          const pct = 10 + Math.round((current / total) * 80);
          onProgress({
            stage: "encrypting",
            percentage: pct,
            message: `Encrypting: ${current}/${total} segments`,
          });
        }
      );

      // Stage 6: Store on Irys
      onProgress({
        stage: "storing",
        percentage: 0,
        message: "Storing on Irys...",
      });

      // Store encrypted segments
      const renditionData = [];
      for (const rendition of encryptedRenditions) {
        // Store each segment
        const segmentCids = [];
        for (let i = 0; i < rendition.encryptedSegments.length; i++) {
          const segment = rendition.encryptedSegments[i];
          const segmentData = JSON.stringify({
            ciphertext: segment.ciphertext,
            dataToEncryptHash: segment.dataToEncryptHash,
          });

          const receipt = await irysService.uploadData(segmentData, [
            { name: "App-Name", value: "DecentralizedVideo" },
            { name: "Content-Type", value: "application/json" },
            { name: "Type", value: "video-segment" },
          ]);
          if (!receipt.success) throw new Error(receipt.error.message);

          segmentCids.push(receipt.data.id);
        }

        renditionData.push({
          quality: rendition.quality,
          bandwidth: rendition.bandwidth,
          playlist: rendition.playlist,
          segmentCids,
          encryptionKeyHash: encryptedRenditions[0]?.encryptedSegments[0]?.dataToEncryptHash || "",
        });

        onProgress({
          stage: "storing",
          percentage: Math.round(
            ((renditionData.length) / encryptedRenditions.length) * 90
          ),
          message: `Storing rendition ${renditionData.length}/${encryptedRenditions.length}`,
        });
      }

      // Extract and upload thumbnail
      onProgress({
        stage: "storing",
        percentage: 95,
        message: "Uploading thumbnail...",
      });

      const thumbnailCid = await this.extractAndUploadThumbnail(
        asset.playbackId,
        address
      );

      // Calculate video duration from HLS manifest
      const duration = this.calculateDuration(hlsManifest);

      // Create metadata
      const metadata: Omit<VideoMetadata, "id"> = {
        creatorAddress: address,
        createdAt: Date.now(),
        title: params.title,
        description: params.description,
        thumbnailCid,
        duration,
        category: params.category,
        tags: params.tags,
        transcodeStatus: "completed",
        hlsManifestCid: "", // Will be set after upload
        renditions: renditionData.map((r) => ({
          quality: r.quality as "1080p" | "720p" | "480p" | "360p",
          bandwidth: r.bandwidth,
          segmentsCid: JSON.stringify(r.segmentCids), // Store segment CIDs as JSON
          encryptionKeyHash: r.encryptionKeyHash,
        })),
        accessType: params.accessType,
        accessControlConditions,
        revenueSplit: params.revenueSplit,
      };

      // Store metadata on Irys
      const metadataReceipt = await irysService.uploadData(
        JSON.stringify(metadata),
        [
          { name: "App-Name", value: "DecentralizedVideo" },
          { name: "Content-Type", value: "application/json" },
          { name: "Type", value: "video-metadata" },
          { name: "Creator", value: address },
          { name: "Title", value: params.title },
          { name: "Category", value: params.category },
          { name: "AccessType", value: params.accessType },
          ...params.tags.map((tag) => ({ name: "Tag", value: tag })),
        ]
      );
      if (!metadataReceipt.success) throw new Error(metadataReceipt.error.message);

      onProgress({
        stage: "completed",
        percentage: 100,
        message: "Upload complete!",
      });

      return metadataReceipt.data.id;
    } catch (error) {
      onProgress({
        stage: "failed",
        percentage: 0,
        message: error instanceof Error ? error.message : "Upload failed",
      });
      throw error;
    }
  }

  /**
   * Query videos from Irys
   */
  async queryVideos(params: VideoQueryParams): Promise<VideoListItem[]> {
    const tags = [
      { name: "App-Name", values: ["DecentralizedVideo"] },
      { name: "Type", values: ["video-metadata"] },
    ];

    if (params.creatorAddress) {
      tags.push({ name: "Creator", values: [params.creatorAddress] });
    }
    if (params.category) {
      tags.push({ name: "Category", values: [params.category] });
    }
    if (params.accessType) {
      tags.push({ name: "AccessType", values: [params.accessType] });
    }
    if (params.tags && params.tags.length > 0) {
      tags.push({ name: "Tag", values: params.tags });
    }

    const query = `
      query {
        transactions(
          tags: ${JSON.stringify(tags).replace(/"name"/g, "name").replace(/"values"/g, "values")}
          first: ${params.limit || 20}
          ${params.offset ? `after: "${params.offset}"` : ""}
          order: DESC
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
              timestamp
            }
          }
        }
      }
    `;

    const response = await fetch("https://uploader.irys.xyz/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const json = await response.json();
    const edges = json.data?.transactions?.edges || [];

    // Fetch full metadata for each video
    const videos: VideoListItem[] = [];
    for (const edge of edges) {
      try {
        const metadata = await this.getVideoMetadata(edge.node.id);
        if (metadata) {
          // Fetch total tips from smart contract
          const totalTips = await this.fetchVideoTotalTips(metadata.id);

          videos.push({
            id: metadata.id,
            title: metadata.title,
            thumbnailCid: metadata.thumbnailCid,
            duration: metadata.duration,
            creatorAddress: metadata.creatorAddress,
            createdAt: metadata.createdAt,
            category: metadata.category,
            accessType: metadata.accessType,
            totalTips,
          });
        }
      } catch {
        // Skip invalid entries
      }
    }

    return videos;
  }

  /**
   * Get full video metadata from Irys
   */
  async getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
    try {
      const response = await fetch(`https://gateway.irys.xyz/${videoId}`);
      if (!response.ok) return null;

      const metadata = await response.json();
      return {
        id: videoId,
        ...metadata,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get decryption access for a video
   */
  async getDecryptionAccess(
    videoId: string,
    walletClient: WalletClient,
    address: string
  ): Promise<{
    canAccess: boolean;
    authSig?: unknown;
    error?: string;
  }> {
    const metadata = await this.getVideoMetadata(videoId);
    if (!metadata) {
      return { canAccess: false, error: "Video not found" };
    }

    try {
      const authSig = await litService.getAuthSig(address, walletClient);

      // Verify access by attempting to connect to Lit
      await litService.connect();

      return {
        canAccess: true,
        authSig,
      };
    } catch (error) {
      return {
        canAccess: false,
        error: error instanceof Error ? error.message : "Access denied",
      };
    }
  }

  /**
   * Load encrypted segments for a video rendition
   */
  async loadEncryptedSegments(
    rendition: VideoMetadata["renditions"][0]
  ): Promise<Map<string, EncryptedSegment>> {
    const segmentCids = JSON.parse(rendition.segmentsCid) as string[];
    const segments = new Map<string, EncryptedSegment>();

    for (let i = 0; i < segmentCids.length; i++) {
      const response = await fetch(`https://gateway.irys.xyz/${segmentCids[i]}`);
      if (response.ok) {
        const data = await response.json();
        segments.set(`segment_${i}.enc`, {
          uri: `segment_${i}.enc`,
          ciphertext: data.ciphertext,
          dataToEncryptHash: data.dataToEncryptHash,
        });
      }
    }

    return segments;
  }

  /**
   * Extract thumbnail from Livepeer and upload to Irys
   */
  private async extractAndUploadThumbnail(
    playbackId: string,
    creatorAddress: string
  ): Promise<string> {
    try {
      // Livepeer provides thumbnail at this endpoint
      const thumbnailUrl = `https://vod-cdn.lp-playback.studio/raw/jxf4iblf6wlsyor6526t4tcmtmqa/catalyst-vod-com/hls/${playbackId}/thumbnails/keyframes_0.png`;

      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        console.warn("Failed to fetch thumbnail, using empty CID");
        return "";
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // Upload to Irys
      const receipt = await irysService.uploadData(
        base64,
        [
          { name: "App-Name", value: "DecentralizedVideo" },
          { name: "Content-Type", value: "image/png" },
          { name: "Type", value: "video-thumbnail" },
          { name: "Creator", value: creatorAddress },
        ]
      );
      if (!receipt.success) throw new Error(receipt.error.message);

      return receipt.data.id;
    } catch (error) {
      console.warn("Thumbnail extraction failed:", error);
      return "";
    }
  }

  /**
   * Fetch total tips for a video from smart contract
   */
  private async fetchVideoTotalTips(videoId: string): Promise<bigint> {
    const contractAddress = getTippingContractAddress();
    if (!contractAddress) {
      return 0n;
    }

    try {
      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: http(),
      });

      const videoIdBytes = keccak256(toBytes(videoId));

      const totalTips = await publicClient.readContract({
        address: contractAddress,
        abi: VIDEO_TIPPING_ABI,
        functionName: "videoTotalTips",
        args: [videoIdBytes],
      });

      return totalTips as bigint;
    } catch (error) {
      console.warn("Failed to fetch total tips:", error);
      return 0n;
    }
  }

  /**
   * Calculate total duration from HLS manifest
   */
  private calculateDuration(manifest: { renditions: { segments: { duration: number }[] }[] }): number {
    if (manifest.renditions.length === 0) return 0;

    // Use first rendition to calculate duration
    const firstRendition = manifest.renditions[0];
    return firstRendition.segments.reduce((sum, seg) => sum + seg.duration, 0);
  }
}

export const videoService = new VideoService();
