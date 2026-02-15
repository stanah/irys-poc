import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IrysServiceImpl } from './irys';

// Mock config module
vi.mock('./config', () => ({
  getEnv: () => ({
    irysGraphqlEndpoint: 'https://uploader.irys.xyz/graphql',
  }),
}));

// Mock Irys SDK
const mockUpload = vi.fn();
const mockGetPrice = vi.fn();
const mockGetBalance = vi.fn();
const mockFund = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockFromAtomic = vi.fn((_val: unknown) => `0.001`);

vi.mock('@irys/web-upload', () => ({
  WebUploader: () => ({
    withAdapter: () =>
      Promise.resolve({
        upload: mockUpload,
        getPrice: mockGetPrice,
        getBalance: mockGetBalance,
        fund: mockFund,
        utils: { fromAtomic: mockFromAtomic },
      }),
  }),
}));

vi.mock('@irys/web-upload-ethereum', () => ({
  WebEthereum: {},
}));

vi.mock('@irys/web-upload-ethereum-viem-v2', () => ({
  ViemV2Adapter: () => ({}),
}));

vi.mock('viem', () => ({
  createWalletClient: () => ({}),
  createPublicClient: () => ({}),
  custom: () => ({}),
}));

vi.mock('viem/chains', () => ({
  polygonAmoy: { id: 80002 },
}));

// Mock window.ethereum
const mockEthereum = {
  request: vi.fn().mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']),
};

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('IrysServiceImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up window.ethereum
    Object.defineProperty(globalThis, 'window', {
      value: { ethereum: mockEthereum },
      writable: true,
      configurable: true,
    });
  });

  describe('uploadData', () => {
    it('成功時にResult<{ id: string }>を返す', async () => {
      mockGetPrice.mockResolvedValue({
        lt: () => false, // balance >= price
        toString: () => '100',
      });
      mockGetBalance.mockResolvedValue({
        lt: () => false, // balance >= price
        toString: () => '200',
      });
      mockUpload.mockResolvedValue({ id: 'irys-tx-123' });

      const service = new IrysServiceImpl();
      const result = await service.uploadData(
        'test data',
        [{ name: 'AppName', value: 'DecentralizedVideo' }]
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('irys-tx-123');
      }
    });

    it('残高不足時にINSUFFICIENT_FUNDSエラーを返す', async () => {
      mockGetPrice.mockResolvedValue({
        toString: () => '1000',
      });
      mockGetBalance.mockResolvedValue({
        lt: () => true, // balance < price
        toString: () => '100',
      });

      const service = new IrysServiceImpl();
      const result = await service.uploadData(
        'test data',
        [{ name: 'AppName', value: 'DecentralizedVideo' }]
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INSUFFICIENT_FUNDS');
        expect(result.error.category).toBe('irys');
        expect(result.error.retryable).toBe(false);
        expect(result.error.message).toContain('ストレージ残高が不足しています');
      }
    });

    it('AbortSignalがaborted済みの場合にABORTEDエラーを返す', async () => {
      const controller = new AbortController();
      controller.abort();

      const service = new IrysServiceImpl();
      const result = await service.uploadData(
        'test data',
        [{ name: 'AppName', value: 'DecentralizedVideo' }],
        { signal: controller.signal }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ABORTED');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('アップロード失敗時にUPLOAD_FAILEDエラーを返す（throwしない）', async () => {
      mockGetPrice.mockResolvedValue({ toString: () => '100' });
      mockGetBalance.mockResolvedValue({
        lt: () => false,
        toString: () => '200',
      });
      mockUpload.mockRejectedValue(new Error('Network error'));

      const service = new IrysServiceImpl();
      const result = await service.uploadData(
        'test data',
        [{ name: 'AppName', value: 'DecentralizedVideo' }]
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UPLOAD_FAILED');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('ウォレット未接続時にWALLET_REQUIREDエラーを返す', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
        configurable: true,
      });

      const service = new IrysServiceImpl();
      const result = await service.uploadData(
        'test data',
        [{ name: 'AppName', value: 'DecentralizedVideo' }]
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WALLET_REQUIRED');
        expect(result.error.retryable).toBe(false);
      }
    });
  });

  describe('getBalance', () => {
    it('成功時にResult<{ balance, formatted }>を返す', async () => {
      mockGetBalance.mockResolvedValue({
        toString: () => '500000000000000',
      });
      mockFromAtomic.mockReturnValue('0.0005');

      const service = new IrysServiceImpl();
      const result = await service.getBalance();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.balance).toBe('500000000000000');
        expect(result.data.formatted).toBe('0.0005');
      }
    });

    it('AbortSignalがaborted済みの場合にABORTEDエラーを返す', async () => {
      const controller = new AbortController();
      controller.abort();

      const service = new IrysServiceImpl();
      const result = await service.getBalance({ signal: controller.signal });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ABORTED');
      }
    });
  });

  describe('deposit', () => {
    it('成功時にResult<void>を返す', async () => {
      mockFund.mockResolvedValue(undefined);

      const service = new IrysServiceImpl();
      const result = await service.deposit('0.001');

      expect(result.success).toBe(true);
    });

    it('失敗時にDEPOSIT_FAILEDエラーを返す', async () => {
      mockFund.mockRejectedValue(new Error('Deposit failed'));

      const service = new IrysServiceImpl();
      const result = await service.deposit('0.001');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('DEPOSIT_FAILED');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('0以下の値でINVALID_AMOUNTエラーを返す', async () => {
      const service = new IrysServiceImpl();

      const resultZero = await service.deposit('0');
      expect(resultZero.success).toBe(false);
      if (!resultZero.success) {
        expect(resultZero.error.code).toBe('INVALID_AMOUNT');
        expect(resultZero.error.retryable).toBe(false);
        expect(resultZero.error.message).toBe('無効なデポジット額です');
      }

      const resultNegative = await service.deposit('-1');
      expect(resultNegative.success).toBe(false);
      if (!resultNegative.success) {
        expect(resultNegative.error.code).toBe('INVALID_AMOUNT');
      }
    });

    it('数値でない文字列でINVALID_AMOUNTエラーを返す', async () => {
      const service = new IrysServiceImpl();
      const result = await service.deposit('abc');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_AMOUNT');
        expect(result.error.retryable).toBe(false);
      }
    });
  });

  describe('queryFiles', () => {
    it('成功時にResult<VideoListItem[]>を返す（環境変数エンドポイント使用）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            transactions: {
              edges: [
                {
                  node: {
                    id: 'tx-1',
                    tags: [
                      { name: 'AppName', value: 'DecentralizedVideo' },
                      { name: 'Creator', value: '0x1234567890abcdef1234567890abcdef12345678' },
                      { name: 'Type', value: 'video-metadata' },
                      { name: 'Title', value: 'Test Video' },
                      { name: 'Category', value: 'gaming' },
                      { name: 'AccessType', value: 'public' },
                      { name: 'Duration', value: '120' },
                    ],
                    timestamp: 1700000000,
                  },
                  cursor: 'cursor-1',
                },
              ],
              pageInfo: { hasNextPage: false },
            },
          },
        }),
      });

      const service = new IrysServiceImpl();
      const result = await service.queryFiles('0x1234567890abcdef1234567890abcdef12345678');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        const item = result.data[0] as {
          id: string; title: string; category: string;
          accessType: string; duration: number; creatorAddress: string;
        };
        expect(item.id).toBe('tx-1');
        expect(item.title).toBe('Test Video');
        expect(item.category).toBe('gaming');
        expect(item.accessType).toBe('public');
        expect(item.duration).toBe(120);
        expect(item.creatorAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
      }

      // GraphQLエンドポイントに環境変数の値が使われている
      expect(mockFetch).toHaveBeenCalledWith(
        'https://uploader.irys.xyz/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('AppName + Creator + Typeの3タグがクエリに含まれる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { transactions: { edges: [], pageInfo: { hasNextPage: false } } } }),
      });

      const service = new IrysServiceImpl();
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      await service.queryFiles(address);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const query = body.query as string;

      expect(query).toContain('"AppName"');
      expect(query).toContain('"DecentralizedVideo"');
      expect(query).toContain('"Creator"');
      expect(query).toContain(address);
      expect(query).toContain('"Type"');
      expect(query).toContain('"video-metadata"');
    });

    it('空アドレスで全件取得: CreatorタグがGraphQLクエリに含まれない', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            transactions: {
              edges: [
                {
                  node: {
                    id: 'tx-all-1',
                    tags: [
                      { name: 'AppName', value: 'DecentralizedVideo' },
                      { name: 'Creator', value: '0xaaaa567890abcdef1234567890abcdef12345678' },
                      { name: 'Type', value: 'video-metadata' },
                      { name: 'Title', value: 'All Video' },
                      { name: 'Category', value: 'music' },
                      { name: 'AccessType', value: 'public' },
                      { name: 'Duration', value: '60' },
                    ],
                    timestamp: 1700000100,
                  },
                  cursor: 'cursor-all-1',
                },
              ],
              pageInfo: { hasNextPage: false },
            },
          },
        }),
      });

      const service = new IrysServiceImpl();
      const result = await service.queryFiles('');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        const item = result.data[0] as { id: string; title: string; category: string };
        expect(item.id).toBe('tx-all-1');
        expect(item.title).toBe('All Video');
        expect(item.category).toBe('music');
      }

      // CreatorタグがGraphQLクエリに含まれないことを確認
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const query = body.query as string;
      expect(query).toContain('"AppName"');
      expect(query).toContain('"Type"');
      expect(query).not.toContain('"Creator"');
    });

    it('クリエイターフィルタ: CreatorタグがGraphQLクエリに含まれる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { transactions: { edges: [], pageInfo: { hasNextPage: false } } } }),
      });

      const service = new IrysServiceImpl();
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      await service.queryFiles(address);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const query = body.query as string;
      expect(query).toContain('"Creator"');
      expect(query).toContain(address);
    });

    it('複合フィルタ: AppName + Type + Creator が全て含まれる', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { transactions: { edges: [], pageInfo: { hasNextPage: false } } } }),
      });

      const service = new IrysServiceImpl();
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      await service.queryFiles(address);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const query = body.query as string;
      expect(query).toContain('"AppName"');
      expect(query).toContain('"DecentralizedVideo"');
      expect(query).toContain('"Type"');
      expect(query).toContain('"video-metadata"');
      expect(query).toContain('"Creator"');
      expect(query).toContain(address);
    });

    it('無効なアドレス形式でQUERY_FAILEDエラーを返す', async () => {
      const service = new IrysServiceImpl();
      const result = await service.queryFiles('invalid-address');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('QUERY_FAILED');
        expect(result.error.retryable).toBe(false);
      }
    });

    it('fetch失敗時にQUERY_FAILEDエラーを返す', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const service = new IrysServiceImpl();
      const result = await service.queryFiles('0x1234567890abcdef1234567890abcdef12345678');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('QUERY_FAILED');
      }
    });

    it('HTTP非200レスポンス時にQUERY_FAILEDエラーを返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const service = new IrysServiceImpl();
      const result = await service.queryFiles('0x1234567890abcdef1234567890abcdef12345678');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('QUERY_FAILED');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('GraphQLエラーレスポンス時にQUERY_FAILEDエラーを返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Invalid query' }],
        }),
      });

      const service = new IrysServiceImpl();
      const result = await service.queryFiles('0x1234567890abcdef1234567890abcdef12345678');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('QUERY_FAILED');
        expect(result.error.retryable).toBe(true);
        expect(result.error.cause).toEqual([{ message: 'Invalid query' }]);
      }
    });
  });

  describe('getMetadata', () => {
    it('成功時にResult<unknown>を返す', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'Test Video', creator: '0xabc' }),
      });

      const service = new IrysServiceImpl();
      const result = await service.getMetadata('tx-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ title: 'Test Video', creator: '0xabc' });
      }
    });

    it('成功時に[METRIC]ログを出力する', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'Test Video' }),
      });

      const service = new IrysServiceImpl();
      await service.getMetadata('tx-metric-test');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[METRIC] event=metadata_fetch, video_id=tx-metric-test'),
      );
      consoleSpy.mockRestore();
    });

    it('404時にMETADATA_NOT_FOUNDエラーを返す', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const service = new IrysServiceImpl();
      const result = await service.getMetadata('missing-tx');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('METADATA_NOT_FOUND');
        expect(result.error.retryable).toBe(false);
      }
    });

    it('ネットワークエラー時にMETADATA_FETCH_FAILEDエラーを返す', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const service = new IrysServiceImpl();
      const result = await service.getMetadata('tx-fail');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('METADATA_FETCH_FAILED');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('AbortSignalがaborted済みの場合にABORTEDエラーを返す', async () => {
      const controller = new AbortController();
      controller.abort();

      const service = new IrysServiceImpl();
      const result = await service.getMetadata('tx-abort', { signal: controller.signal });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ABORTED');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('無効なトランザクションIDでMETADATA_NOT_FOUNDエラーを返す', async () => {
      const service = new IrysServiceImpl();
      const result = await service.getMetadata('invalid/tx!id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('METADATA_NOT_FOUND');
        expect(result.error.retryable).toBe(false);
      }
    });

    it('HTTP 500時にMETADATA_FETCH_FAILED（retryable）エラーを返す', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const service = new IrysServiceImpl();
      const result = await service.getMetadata('tx-server-error');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('METADATA_FETCH_FAILED');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('タイムアウト時にABORTEDエラーを返す', async () => {
      mockFetch.mockImplementationOnce(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException('Timeout', 'TimeoutError')), 50);
        })
      );

      const service = new IrysServiceImpl();
      const result = await service.getMetadata('tx-timeout');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ABORTED');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('Irys Gateway URLを使用する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'Test' }),
      });

      const service = new IrysServiceImpl();
      await service.getMetadata('tx-gateway');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://gateway.irys.xyz/tx-gateway',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});
