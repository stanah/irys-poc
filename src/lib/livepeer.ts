import { Livepeer } from "livepeer";
import * as tus from "tus-js-client";
import { getEnv } from "./config";
import type { LivepeerService as LivepeerServiceInterface } from "@/types/services";
import type { Result } from "@/types/errors";
import type {
  LivepeerAsset,
  LivepeerUploadResponse,
  HLSManifest,
  HLSSegment,
} from "@/types/video";

export class LivepeerServiceImpl implements LivepeerServiceInterface {
  private client: Livepeer | null = null;
  private static readonly TIMEOUT_MS = 30_000; // NFR-I3: Livepeer 30秒

  private getClient(): Result<Livepeer> {
    if (!this.client) {
      const apiKey = getEnv().livepeerApiKey;
      if (!apiKey) {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'API_KEY_MISSING',
            message: 'Livepeer APIキーが設定されていません',
            retryable: false,
          },
        };
      }
      this.client = new Livepeer({ apiKey });
    }
    return { success: true, data: this.client };
  }

  async createAsset(
    name: string,
    options?: { signal?: AbortSignal }
  ): Promise<Result<LivepeerUploadResponse>> {
    if (options?.signal?.aborted) {
      return {
        success: false,
        error: {
          category: 'livepeer',
          code: 'ABORTED',
          message: '操作がキャンセルされました',
          retryable: true,
        },
      };
    }

    const clientResult = this.getClient();
    if (!clientResult.success) {
      return clientResult;
    }
    const client = clientResult.data;

    try {
      const timeoutSignal = AbortSignal.timeout(LivepeerServiceImpl.TIMEOUT_MS);
      const combinedSignal = options?.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

      const response = await Promise.race([
        client.asset.create({
          name,
          storage: {
            ipfs: false,
          },
          playbackPolicy: {
            type: "public",
          },
        } as Parameters<typeof client.asset.create>[0]),
        new Promise<never>((_, reject) => {
          combinedSignal.addEventListener('abort', () =>
            reject(new DOMException('Timeout', 'TimeoutError'))
          );
        }),
      ]);

      if (!response.data?.asset?.id) {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'CREATE_ASSET_FAILED',
            message: 'アセット作成に失敗しました',
            retryable: true,
          },
        };
      }

      const asset = response.data.asset;
      const tusEndpoint = response.data.tusEndpoint;

      if (!tusEndpoint) {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'NO_TUS_ENDPOINT',
            message: 'アップロード先が取得できませんでした',
            retryable: true,
          },
        };
      }

      return {
        success: true,
        data: {
          assetId: asset.id,
          uploadUrl: tusEndpoint,
          tusEndpoint,
          task: response.data.task ? { id: response.data.task.id } : undefined,
        },
      };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'TimeoutError') {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'TIMEOUT',
            message: 'アセット作成がタイムアウトしました',
            retryable: true,
            cause: e,
          },
        };
      }
      if (e instanceof DOMException && e.name === 'AbortError') {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'ABORTED',
            message: '操作がキャンセルされました',
            retryable: true,
          },
        };
      }
      return {
        success: false,
        error: {
          category: 'livepeer',
          code: 'CREATE_ASSET_FAILED',
          message: 'アセット作成に失敗しました',
          retryable: true,
          cause: e,
        },
      };
    }
  }

  async uploadWithTus(
    file: File,
    tusEndpoint: string,
    onProgress?: (percentage: number) => void,
    options?: { signal?: AbortSignal }
  ): Promise<Result<void>> {
    if (options?.signal?.aborted) {
      return {
        success: false,
        error: {
          category: 'livepeer',
          code: 'ABORTED',
          message: '操作がキャンセルされました',
          retryable: true,
        },
      };
    }

    return new Promise((resolve) => {
      const upload = new tus.Upload(file, {
        endpoint: tusEndpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onError: (error) => {
          resolve({
            success: false,
            error: {
              category: 'livepeer',
              code: 'UPLOAD_FAILED',
              message: '動画のアップロードに失敗しました',
              retryable: true,
              cause: error,
            },
          });
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          console.log(
            `[METRIC] event=upload_progress, percentage=${percentage}, stage=uploading, timestamp=${new Date().toISOString()}`
          );
          onProgress?.(percentage);
        },
        onSuccess: () => {
          resolve({ success: true, data: undefined });
        },
      });

      const onAbort = () => {
        upload.abort();
        resolve({
          success: false,
          error: {
            category: 'livepeer',
            code: 'UPLOAD_CANCELLED',
            message: 'アップロードがキャンセルされました',
            retryable: true,
          },
        });
      };
      options?.signal?.addEventListener('abort', onAbort, { once: true });

      upload.start();
    });
  }

  async getAsset(
    assetId: string,
    options?: { signal?: AbortSignal }
  ): Promise<Result<LivepeerAsset>> {
    if (options?.signal?.aborted) {
      return {
        success: false,
        error: {
          category: 'livepeer',
          code: 'ABORTED',
          message: '操作がキャンセルされました',
          retryable: true,
        },
      };
    }

    const clientResult = this.getClient();
    if (!clientResult.success) {
      return clientResult;
    }
    const client = clientResult.data;

    try {
      const response = await client.asset.get(assetId);

      if (!response.asset) {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'ASSET_NOT_FOUND',
            message: '動画が見つかりません',
            retryable: false,
          },
        };
      }

      const asset = response.asset;

      return {
        success: true,
        data: {
          id: asset.id,
          playbackId: asset.playbackId || "",
          status: {
            phase: this.mapPhase(asset.status?.phase),
            errorMessage: asset.status?.errorMessage,
            progress: asset.status?.progress,
          },
          playbackUrl: asset.playbackUrl,
          downloadUrl: asset.downloadUrl,
        },
      };
    } catch (e) {
      return {
        success: false,
        error: {
          category: 'livepeer',
          code: 'ASSET_NOT_FOUND',
          message: '動画が見つかりません',
          retryable: false,
          cause: e,
        },
      };
    }
  }

  async waitForReady(
    assetId: string,
    onProgress?: (status: LivepeerAsset["status"]) => void,
    options?: { signal?: AbortSignal; maxWaitMs?: number }
  ): Promise<Result<LivepeerAsset>> {
    if (options?.signal?.aborted) {
      return {
        success: false,
        error: {
          category: 'livepeer',
          code: 'ABORTED',
          message: '操作がキャンセルされました',
          retryable: true,
        },
      };
    }

    const maxWaitMs = options?.maxWaitMs ?? 600000;
    const startTime = Date.now();
    const pollInterval = 5000;

    while (Date.now() - startTime < maxWaitMs) {
      if (options?.signal?.aborted) {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'ABORTED',
            message: '操作がキャンセルされました',
            retryable: true,
          },
        };
      }

      const assetResult = await this.getAsset(assetId, options);
      if (!assetResult.success) {
        return assetResult;
      }

      const asset = assetResult.data;
      onProgress?.(asset.status);

      if (asset.status.phase === "ready") {
        return { success: true, data: asset };
      }

      if (asset.status.phase === "failed") {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'TRANSCODE_FAILED',
            message: 'トランスコードに失敗しました',
            retryable: false,
            cause: asset.status.errorMessage,
          },
        };
      }

      await this.sleep(pollInterval);
    }

    return {
      success: false,
      error: {
        category: 'livepeer',
        code: 'TRANSCODE_TIMEOUT',
        message: 'トランスコードがタイムアウトしました',
        retryable: true,
      },
    };
  }

  async downloadHlsManifest(
    playbackId: string,
    options?: { signal?: AbortSignal }
  ): Promise<Result<HLSManifest>> {
    if (options?.signal?.aborted) {
      return {
        success: false,
        error: {
          category: 'livepeer',
          code: 'ABORTED',
          message: '操作がキャンセルされました',
          retryable: true,
        },
      };
    }

    try {
      const baseUrl = `https://livepeer.studio/api/playback/${playbackId}`;

      const infoResponse = await fetch(baseUrl, { signal: options?.signal });
      if (!infoResponse.ok) {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'PLAYBACK_INFO_FAILED',
            message: '再生情報の取得に失敗しました',
            retryable: true,
          },
        };
      }

      const playbackInfo = await infoResponse.json();
      const hlsUrl =
        playbackInfo.meta?.source?.[0]?.hrn === "HLS (TS)"
          ? playbackInfo.meta?.source?.[0]?.url
          : null;

      if (!hlsUrl) {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'HLS_URL_NOT_AVAILABLE',
            message: 'HLS URLが利用できません',
            retryable: true,
          },
        };
      }

      const masterResponse = await fetch(hlsUrl, { signal: options?.signal });
      if (!masterResponse.ok) {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'MASTER_PLAYLIST_FAILED',
            message: 'マスタープレイリストの取得に失敗しました',
            retryable: true,
          },
        };
      }

      const masterPlaylist = await masterResponse.text();
      const renditions = await this.parseAndFetchRenditions(
        hlsUrl,
        masterPlaylist,
        options
      );

      return {
        success: true,
        data: {
          masterPlaylist,
          renditions,
        },
      };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return {
          success: false,
          error: {
            category: 'livepeer',
            code: 'ABORTED',
            message: '操作がキャンセルされました',
            retryable: true,
          },
        };
      }
      return {
        success: false,
        error: {
          category: 'livepeer',
          code: 'HLS_DOWNLOAD_FAILED',
          message: 'HLSマニフェストのダウンロードに失敗しました',
          retryable: true,
          cause: e,
        },
      };
    }
  }

  private async parseAndFetchRenditions(
    baseUrl: string,
    masterPlaylist: string,
    options?: { signal?: AbortSignal }
  ): Promise<HLSManifest["renditions"]> {
    const lines = masterPlaylist.split("\n");
    const renditions: HLSManifest["renditions"] = [];
    const baseUrlPath = baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1);

    let currentBandwidth = 0;
    let currentQuality = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("#EXT-X-STREAM-INF:")) {
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
        const playlistUrl = line.startsWith("http")
          ? line
          : baseUrlPath + line;

        const { playlist, segments } = await this.fetchPlaylistAndSegments(
          playlistUrl,
          options
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

  private async fetchPlaylistAndSegments(
    playlistUrl: string,
    options?: { signal?: AbortSignal }
  ): Promise<{ playlist: string; segments: HLSSegment[] }> {
    const response = await fetch(playlistUrl, { signal: options?.signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${playlistUrl}`);
    }

    const playlist = await response.text();
    const segments: HLSSegment[] = [];
    const baseUrlPath =
      playlistUrl.substring(0, playlistUrl.lastIndexOf("/") + 1);
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
        const segmentUrl = trimmed.startsWith("http")
          ? trimmed
          : baseUrlPath + trimmed;

        const segmentResponse = await fetch(segmentUrl, {
          signal: options?.signal,
        });
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

  private heightToQuality(height: number): string {
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    return "360p";
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const livepeerServiceImpl = new LivepeerServiceImpl();

// 後方互換: video.ts 等の既存コードが参照している
export const livepeerService = livepeerServiceImpl;
