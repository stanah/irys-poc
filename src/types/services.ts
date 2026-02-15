import type { Result } from './errors';
import type {
  AccessControlCondition,
  VideoMetadata,
  UploadVideoParams,
  VideoQueryParams,
  VideoListItem,
  LivepeerAsset,
  LivepeerUploadResponse,
  HLSManifest,
} from './video';

/**
 * Lit Protocol session signatures.
 * Placeholder until Naga migration (Story 4.1) provides concrete SDK v8 types.
 */
export type LitSessionSigs = Record<string, unknown>;

export interface LitService {
  connect(options?: { signal?: AbortSignal }): Promise<Result<void>>;
  getSession(
    address: string,
    walletClient: unknown, // Will be typed as unified Wallet interface in Story 1.2
    options?: { signal?: AbortSignal },
  ): Promise<Result<LitSessionSigs>>;
  encrypt(
    file: File,
    accessControlConditions: AccessControlCondition[],
    sessionSigs: LitSessionSigs,
    options?: { signal?: AbortSignal },
  ): Promise<Result<{ ciphertext: string; dataToEncryptHash: string }>>;
  decrypt(
    ciphertext: string,
    dataToEncryptHash: string,
    accessControlConditions: AccessControlCondition[],
    sessionSigs: LitSessionSigs,
    options?: { signal?: AbortSignal },
  ): Promise<Result<Uint8Array>>;
}

export interface IrysService {
  uploadData(
    data: string,
    tags: { name: string; value: string }[],
    options?: { signal?: AbortSignal },
  ): Promise<Result<{ id: string }>>;
  getBalance(
    options?: { signal?: AbortSignal },
  ): Promise<Result<{ balance: string; formatted: string }>>;
  deposit(
    amount: string,
    options?: { signal?: AbortSignal },
  ): Promise<Result<void>>;
  queryFiles(
    recipientAddress: string,
    options?: { signal?: AbortSignal },
  ): Promise<Result<unknown[]>>;
  getMetadata(
    transactionId: string,
    options?: { signal?: AbortSignal },
  ): Promise<Result<unknown>>;
}

export interface LivepeerService {
  createAsset(
    name: string,
    options?: { signal?: AbortSignal },
  ): Promise<Result<LivepeerUploadResponse>>;
  uploadWithTus(
    file: File,
    tusEndpoint: string,
    onProgress?: (percentage: number) => void,
    options?: { signal?: AbortSignal },
  ): Promise<Result<void>>;
  waitForReady(
    assetId: string,
    onProgress?: (status: LivepeerAsset['status']) => void,
    options?: { signal?: AbortSignal; maxWaitMs?: number },
  ): Promise<Result<LivepeerAsset>>;
  downloadHlsManifest(
    playbackId: string,
    options?: { signal?: AbortSignal },
  ): Promise<Result<HLSManifest>>;
}

export interface VideoService {
  uploadVideo(
    params: UploadVideoParams,
    walletClient: unknown,
    address: string,
    onProgress: (progress: { stage: string; percentage: number; message: string }) => void,
    options?: { signal?: AbortSignal },
  ): Promise<Result<string>>;
  queryVideos(
    params: VideoQueryParams,
    options?: { signal?: AbortSignal },
  ): Promise<Result<VideoListItem[]>>;
  getVideoMetadata(
    videoId: string,
    options?: { signal?: AbortSignal },
  ): Promise<Result<VideoMetadata | null>>;
}
