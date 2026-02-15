import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivepeerService } from './livepeer';

// Mock the config module
vi.mock('./config', () => ({
  getEnv: () => ({
    livepeerApiKey: 'test-livepeer-key',
  }),
}));

// Mock tus-js-client with class-based constructor
let tusOnProgress: ((bytesUploaded: number, bytesTotal: number) => void) | undefined;
let tusOnSuccess: (() => void) | undefined;
let tusOnError: ((error: Error) => void) | undefined;

vi.mock('tus-js-client', () => ({
  Upload: class MockUpload {
    constructor(_file: any, options: any) {
      tusOnProgress = options.onProgress;
      tusOnSuccess = options.onSuccess;
      tusOnError = options.onError;
    }
    start() {
      tusOnProgress?.(50, 100);
      tusOnSuccess?.();
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

describe('LivepeerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAsset', () => {
    it('should create asset and return upload details', async () => {
      mockCreate.mockResolvedValue({
        data: {
          asset: { id: 'asset-123' },
          tusEndpoint: 'https://tus.livepeer.studio/upload/abc',
          task: { id: 'task-1' },
        },
      });

      const service = new LivepeerService();
      const result = await service.createAsset('My Video');

      expect(result.assetId).toBe('asset-123');
      expect(result.tusEndpoint).toBe('https://tus.livepeer.studio/upload/abc');
      expect(result.task?.id).toBe('task-1');
    });

    it('should throw when asset creation fails', async () => {
      mockCreate.mockResolvedValue({
        data: { asset: null },
      });

      const service = new LivepeerService();
      await expect(service.createAsset('Fail')).rejects.toThrow(
        'Failed to create Livepeer asset'
      );
    });

    it('should throw when no TUS endpoint is provided', async () => {
      mockCreate.mockResolvedValue({
        data: {
          asset: { id: 'asset-123' },
          tusEndpoint: null,
        },
      });

      const service = new LivepeerService();
      await expect(service.createAsset('No TUS')).rejects.toThrow(
        'No TUS endpoint provided'
      );
    });
  });

  describe('getAsset', () => {
    it('should return mapped asset details', async () => {
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

      const service = new LivepeerService();
      const asset = await service.getAsset('asset-123');

      expect(asset.id).toBe('asset-123');
      expect(asset.playbackId).toBe('playback-abc');
      expect(asset.status.phase).toBe('ready');
      expect(asset.playbackUrl).toBe('https://playback.url');
    });

    it('should throw when asset is not found', async () => {
      mockGet.mockResolvedValue({ asset: null });

      const service = new LivepeerService();
      await expect(service.getAsset('missing')).rejects.toThrow(
        'Asset not found'
      );
    });

    it('should map unknown phase to waiting', async () => {
      mockGet.mockResolvedValue({
        asset: {
          id: 'asset-1',
          playbackId: '',
          status: { phase: 'something-unknown' },
        },
      });

      const service = new LivepeerService();
      const asset = await service.getAsset('asset-1');
      expect(asset.status.phase).toBe('waiting');
    });

    it('should map uploading phase to processing', async () => {
      mockGet.mockResolvedValue({
        asset: {
          id: 'asset-1',
          playbackId: '',
          status: { phase: 'uploading' },
        },
      });

      const service = new LivepeerService();
      const asset = await service.getAsset('asset-1');
      expect(asset.status.phase).toBe('processing');
    });
  });

  describe('uploadWithTus', () => {
    it('should upload file and report progress', async () => {
      const service = new LivepeerService();
      const onProgress = vi.fn();
      const file = new File(['test'], 'video.mp4', { type: 'video/mp4' });

      await service.uploadWithTus(file, 'https://tus.endpoint', onProgress);

      expect(onProgress).toHaveBeenCalledWith(50);
    });
  });

  describe('downloadHlsManifest', () => {
    it('should throw when playback info request fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const service = new LivepeerService();
      await expect(
        service.downloadHlsManifest('playback-1')
      ).rejects.toThrow('Failed to get playback info');
    });

    it('should throw when HLS URL is not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          meta: {
            source: [{ hrn: 'MP4', url: 'http://example.com/video.mp4' }],
          },
        }),
      });

      const service = new LivepeerService();
      await expect(
        service.downloadHlsManifest('playback-1')
      ).rejects.toThrow('HLS URL not available');
    });
  });
});
