import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies before importing video module
vi.mock('./livepeer', () => ({
  livepeerService: {
    createAsset: vi.fn(),
    uploadWithTus: vi.fn(),
    waitForReady: vi.fn(),
    downloadHlsManifest: vi.fn(),
    getAsset: vi.fn(),
  },
}));

vi.mock('./irys', () => ({
  irysService: {
    uploadData: vi.fn(),
    getBalance: vi.fn(),
    fundAccount: vi.fn(),
    getUploadPrice: vi.fn(),
    queryFiles: vi.fn(),
  },
}));

vi.mock('./lit', () => ({
  litService: {
    connect: vi.fn(),
    getAuthSig: vi.fn(),
    encryptFile: vi.fn(),
    decryptFile: vi.fn(),
  },
}));

vi.mock('./encryption', () => ({
  encryptHlsManifest: vi.fn(),
  generateAccessControlConditions: vi.fn().mockReturnValue([
    {
      contractAddress: '',
      chain: 'polygon',
      method: '',
      parameters: [':userAddress'],
      returnValueTest: { comparator: '!=', value: '0x0' },
    },
  ]),
}));

vi.mock('./config', () => ({
  getEnv: () => ({
    alchemyApiKey: 'test-key',
    walletConnectProjectId: 'test-wc',
    livepeerApiKey: 'test-livepeer',
    tippingContract: undefined,
    platformFeePercent: 10,
  }),
}));

vi.mock('@/types/contracts', () => ({
  VIDEO_TIPPING_ABI: [],
  getTippingContractAddress: () => undefined,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('VideoService', () => {
  let VideoService: typeof import('./video').VideoService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('./video');
    VideoService = mod.VideoService;
  });

  describe('getVideoMetadata', () => {
    it('should fetch and return video metadata', async () => {
      const metadata = {
        title: 'Test Video',
        creatorAddress: '0x123',
        createdAt: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => metadata,
      });

      const service = new VideoService();
      const result = await service.getVideoMetadata('video-id-1');

      expect(result).toEqual({
        id: 'video-id-1',
        ...metadata,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.irys.xyz/video-id-1'
      );
    });

    it('should return null when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const service = new VideoService();
      const result = await service.getVideoMetadata('not-found');

      expect(result).toBeNull();
    });

    it('should return null when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const service = new VideoService();
      const result = await service.getVideoMetadata('error-id');

      expect(result).toBeNull();
    });
  });

  describe('queryVideos', () => {
    it('should build GraphQL query with default tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { transactions: { edges: [] } },
        }),
      });

      const service = new VideoService();
      await service.queryVideos({});

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.query).toContain('App-Name');
      expect(body.query).toContain('DecentralizedVideo');
      expect(body.query).toContain('video-metadata');
    });

    it('should include creator filter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { transactions: { edges: [] } },
        }),
      });

      const service = new VideoService();
      await service.queryVideos({ creatorAddress: '0xABC' });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.query).toContain('Creator');
      expect(body.query).toContain('0xABC');
    });

    it('should include category filter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { transactions: { edges: [] } },
        }),
      });

      const service = new VideoService();
      await service.queryVideos({ category: 'gaming' });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.query).toContain('Category');
      expect(body.query).toContain('gaming');
    });

    it('should use custom limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { transactions: { edges: [] } },
        }),
      });

      const service = new VideoService();
      await service.queryVideos({ limit: 5 });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.query).toContain('first: 5');
    });

    it('should skip invalid metadata entries', async () => {
      // GraphQL response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            transactions: {
              edges: [
                { node: { id: 'tx-1', tags: [], timestamp: 1 } },
                { node: { id: 'tx-2', tags: [], timestamp: 2 } },
              ],
            },
          },
        }),
      });

      // tx-1 metadata succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Video 1',
          thumbnailCid: 'thumb-1',
          duration: 120,
          creatorAddress: '0x123',
          createdAt: Date.now(),
          category: 'gaming',
          accessType: 'public',
        }),
      });

      // tx-2 metadata fails
      mockFetch.mockRejectedValueOnce(new Error('Failed'));

      const service = new VideoService();
      const videos = await service.queryVideos({});

      expect(videos).toHaveLength(1);
      expect(videos[0].id).toBe('tx-1');
    });
  });

  describe('loadEncryptedSegments', () => {
    it('should load and map encrypted segments', async () => {
      const rendition = {
        quality: '720p' as const,
        bandwidth: 2000000,
        segmentsCid: JSON.stringify(['cid-1', 'cid-2']),
        encryptionKeyHash: 'hash-1',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ciphertext: 'encrypted-data-1',
            dataToEncryptHash: 'hash-1',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ciphertext: 'encrypted-data-2',
            dataToEncryptHash: 'hash-2',
          }),
        });

      const service = new VideoService();
      const segments = await service.loadEncryptedSegments(rendition);

      expect(segments.size).toBe(2);
      expect(segments.get('segment_0.enc')).toEqual({
        uri: 'segment_0.enc',
        ciphertext: 'encrypted-data-1',
        dataToEncryptHash: 'hash-1',
      });
      expect(segments.get('segment_1.enc')).toEqual({
        uri: 'segment_1.enc',
        ciphertext: 'encrypted-data-2',
        dataToEncryptHash: 'hash-2',
      });
    });

    it('should skip segments with failed fetch', async () => {
      const rendition = {
        quality: '480p' as const,
        bandwidth: 1000000,
        segmentsCid: JSON.stringify(['cid-1', 'cid-fail']),
        encryptionKeyHash: 'hash-1',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ciphertext: 'data-1',
            dataToEncryptHash: 'hash-1',
          }),
        })
        .mockResolvedValueOnce({ ok: false });

      const service = new VideoService();
      const segments = await service.loadEncryptedSegments(rendition);

      expect(segments.size).toBe(1);
    });
  });
});
