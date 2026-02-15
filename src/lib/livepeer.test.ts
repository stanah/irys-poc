import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivepeerServiceImpl } from './livepeer';

// Mock the config module
vi.mock('./config', () => ({
  getEnv: () => ({
    livepeerApiKey: 'test-livepeer-key',
  }),
}));

// Mock tus-js-client with class-based constructor
let tusOnProgress: ((bytesUploaded: number, bytesTotal: number) => void) | undefined;
let tusOnSuccess: (() => void) | undefined;
let tusAbort: ReturnType<typeof vi.fn>;

vi.mock('tus-js-client', () => ({
  Upload: class MockUpload {
    constructor(_file: unknown, options: Record<string, unknown>) {
      tusOnProgress = options.onProgress as typeof tusOnProgress;
      tusOnSuccess = options.onSuccess as typeof tusOnSuccess;
    }
    start() {
      tusOnProgress?.(50, 100);
      tusOnSuccess?.();
    }
    abort() {
      tusAbort?.();
    }
  },
}));

// Mock livepeer SDK with class-based constructor
const mockCreate = vi.fn();
const mockGet = vi.fn();

vi.mock('livepeer', () => ({
  Livepeer: class MockLivepeer {
    asset = {
      create: mockCreate,
      get: mockGet,
    };
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('LivepeerServiceImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tusAbort = vi.fn();
  });

  describe('createAsset', () => {
    it('成功時にResult<LivepeerUploadResponse>を返す', async () => {
      mockCreate.mockResolvedValue({
        data: {
          asset: { id: 'asset-123' },
          tusEndpoint: 'https://tus.livepeer.studio/upload/abc',
          task: { id: 'task-1' },
        },
      });

      const service = new LivepeerServiceImpl();
      const result = await service.createAsset('My Video');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assetId).toBe('asset-123');
        expect(result.data.tusEndpoint).toBe('https://tus.livepeer.studio/upload/abc');
        expect(result.data.task?.id).toBe('task-1');
      }
    });

    it('アセット作成失敗時にResult errorを返す', async () => {
      mockCreate.mockResolvedValue({
        data: { asset: null },
      });

      const service = new LivepeerServiceImpl();
      const result = await service.createAsset('Fail');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.category).toBe('livepeer');
        expect(result.error.code).toBe('CREATE_ASSET_FAILED');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('TUSエンドポイント未取得時にResult errorを返す', async () => {
      mockCreate.mockResolvedValue({
        data: {
          asset: { id: 'asset-123' },
          tusEndpoint: null,
        },
      });

      const service = new LivepeerServiceImpl();
      const result = await service.createAsset('No TUS');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NO_TUS_ENDPOINT');
      }
    });

    it('AbortSignalがaborted済みの場合にResult errorを返す', async () => {
      const controller = new AbortController();
      controller.abort();

      const service = new LivepeerServiceImpl();
      const result = await service.createAsset('Test', { signal: controller.signal });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ABORTED');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('例外発生時にResult errorを返す（throwしない）', async () => {
      mockCreate.mockRejectedValue(new Error('Network error'));

      const service = new LivepeerServiceImpl();
      const result = await service.createAsset('Error');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CREATE_ASSET_FAILED');
        expect(result.error.cause).toBeInstanceOf(Error);
      }
    });
  });

  describe('getAsset', () => {
    it('成功時にResult<LivepeerAsset>を返す', async () => {
      mockGet.mockResolvedValue({
        asset: {
          id: 'asset-123',
          playbackId: 'playback-abc',
          status: {
            phase: 'ready',
            progress: 1,
          },
          playbackUrl: 'https://playback.url',
          downloadUrl: 'https://download.url',
        },
      });

      const service = new LivepeerServiceImpl();
      const result = await service.getAsset('asset-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('asset-123');
        expect(result.data.playbackId).toBe('playback-abc');
        expect(result.data.status.phase).toBe('ready');
      }
    });

    it('アセット未発見時にResult errorを返す', async () => {
      mockGet.mockResolvedValue({ asset: null });

      const service = new LivepeerServiceImpl();
      const result = await service.getAsset('missing');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ASSET_NOT_FOUND');
        expect(result.error.retryable).toBe(false);
      }
    });

    it('unknown phaseをwaitingにマッピングする', async () => {
      mockGet.mockResolvedValue({
        asset: {
          id: 'asset-1',
          playbackId: '',
          status: { phase: 'something-unknown' },
        },
      });

      const service = new LivepeerServiceImpl();
      const result = await service.getAsset('asset-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status.phase).toBe('waiting');
      }
    });

    it('uploading phaseをprocessingにマッピングする', async () => {
      mockGet.mockResolvedValue({
        asset: {
          id: 'asset-1',
          playbackId: '',
          status: { phase: 'uploading' },
        },
      });

      const service = new LivepeerServiceImpl();
      const result = await service.getAsset('asset-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status.phase).toBe('processing');
      }
    });
  });

  describe('uploadWithTus', () => {
    it('成功時にResult<void>を返し進捗を報告する', async () => {
      const service = new LivepeerServiceImpl();
      const onProgress = vi.fn();
      const file = new File(['test'], 'video.mp4', { type: 'video/mp4' });

      const result = await service.uploadWithTus(file, 'https://tus.endpoint', onProgress);

      expect(result.success).toBe(true);
      expect(onProgress).toHaveBeenCalledWith(50);
    });

    it('AbortSignalがaborted済みの場合にResult errorを返す', async () => {
      const controller = new AbortController();
      controller.abort();

      const service = new LivepeerServiceImpl();
      const file = new File(['test'], 'video.mp4', { type: 'video/mp4' });

      const result = await service.uploadWithTus(
        file,
        'https://tus.endpoint',
        undefined,
        { signal: controller.signal }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ABORTED');
      }
    });
  });

  describe('downloadHlsManifest', () => {
    it('再生情報取得失敗時にResult errorを返す', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const service = new LivepeerServiceImpl();
      const result = await service.downloadHlsManifest('playback-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PLAYBACK_INFO_FAILED');
      }
    });

    it('HLS URL未取得時にResult errorを返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meta: {
            source: [{ hrn: 'MP4', url: 'http://example.com/video.mp4' }],
          },
        }),
      });

      const service = new LivepeerServiceImpl();
      const result = await service.downloadHlsManifest('playback-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('HLS_URL_NOT_AVAILABLE');
      }
    });
  });
});
