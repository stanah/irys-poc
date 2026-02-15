import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('should pass with all required variables set', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';

      const { env } = await import('@/lib/config');
      expect(env.NEXT_PUBLIC_ALCHEMY_API_KEY).toBe('test-alchemy-key');
      expect(env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID).toBe('test-wc-project-id');
      expect(env.NEXT_PUBLIC_PRIVY_APP_ID).toBe('test-privy-app-id');
    });

    it('should throw when NEXT_PUBLIC_ALCHEMY_API_KEY is missing', async () => {
      delete process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';

      await expect(import('@/lib/config')).rejects.toThrow('Invalid environment variables');
    });

    it('should throw when NEXT_PUBLIC_ALCHEMY_API_KEY is empty', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = '';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';

      await expect(import('@/lib/config')).rejects.toThrow('Invalid environment variables');
    });

    it('should throw when NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is missing', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      delete process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';

      await expect(import('@/lib/config')).rejects.toThrow('Invalid environment variables');
    });

    it('should default NEXT_PUBLIC_PLATFORM_FEE_PERCENT to 10 when not set', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';
      delete process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT;

      const { env } = await import('@/lib/config');
      expect(env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT).toBe(10);
    });

    it('should coerce NEXT_PUBLIC_PLATFORM_FEE_PERCENT to number', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';
      process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT = '15';

      const { env } = await import('@/lib/config');
      expect(env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT).toBe(15);
    });

    it('should accept optional variables when not set', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';

      const { env } = await import('@/lib/config');
      expect(env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID).toBeUndefined();
      expect(env.NEXT_PUBLIC_LIVEPEER_API_KEY).toBeUndefined();
      expect(env.NEXT_PUBLIC_TIPPING_CONTRACT).toBeUndefined();
      expect(env.NEXT_PUBLIC_PLATFORM_ADDRESS).toBeUndefined();
      expect(env.NEXT_PUBLIC_PIMLICO_API_KEY).toBeUndefined();
    });
  });

  describe('getEnv (backward compatibility)', () => {
    it('should return mapped environment values', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';
      process.env.NEXT_PUBLIC_LIVEPEER_API_KEY = 'test-livepeer-key';

      const { getEnv } = await import('@/lib/config');
      const result = getEnv();
      expect(result.alchemyApiKey).toBe('test-alchemy-key');
      expect(result.walletConnectProjectId).toBe('test-wc-project-id');
      expect(result.livepeerApiKey).toBe('test-livepeer-key');
      expect(result.platformFeePercent).toBe(10);
    });
  });

  describe('siteConfig', () => {
    it('should export site configuration with default URL', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';

      const { siteConfig } = await import('@/lib/config');
      expect(siteConfig.name).toBe('DecentralizedVideo');
      expect(siteConfig.description).toBeDefined();
      expect(siteConfig.url).toBe('http://localhost:3000');
    });

    it('should use NEXT_PUBLIC_APP_URL when provided', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';

      const { siteConfig } = await import('@/lib/config');
      expect(siteConfig.url).toBe('https://example.com');
    });
  });

  describe('Ethereum address validation', () => {
    it('should reject invalid Ethereum address for NEXT_PUBLIC_TIPPING_CONTRACT', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';
      process.env.NEXT_PUBLIC_TIPPING_CONTRACT = 'not-a-valid-address';

      await expect(import('@/lib/config')).rejects.toThrow('Invalid environment variables');
    });

    it('should accept valid Ethereum address', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';
      process.env.NEXT_PUBLIC_TIPPING_CONTRACT = '0x1234567890abcdef1234567890abcdef12345678';

      const { getEnv } = await import('@/lib/config');
      expect(getEnv().tippingContract).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });
  });

  describe('Privy environment variables', () => {
    it('should throw when NEXT_PUBLIC_PRIVY_APP_ID is missing', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      delete process.env.NEXT_PUBLIC_PRIVY_APP_ID;

      await expect(import('@/lib/config')).rejects.toThrow('Invalid environment variables');
    });

    it('should throw when NEXT_PUBLIC_PRIVY_APP_ID is empty', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = '';

      await expect(import('@/lib/config')).rejects.toThrow('Invalid environment variables');
    });

    it('should accept valid NEXT_PUBLIC_PRIVY_APP_ID', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';

      const { env } = await import('@/lib/config');
      expect(env.NEXT_PUBLIC_PRIVY_APP_ID).toBe('test-privy-app-id');
    });

    it('should accept optional NEXT_PUBLIC_PIMLICO_API_KEY when not set', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';
      delete process.env.NEXT_PUBLIC_PIMLICO_API_KEY;

      const { env } = await import('@/lib/config');
      expect(env.NEXT_PUBLIC_PIMLICO_API_KEY).toBeUndefined();
    });

    it('should accept NEXT_PUBLIC_PIMLICO_API_KEY when provided', async () => {
      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';
      process.env.NEXT_PUBLIC_PIMLICO_API_KEY = 'test-pimlico-key';

      const { env } = await import('@/lib/config');
      expect(env.NEXT_PUBLIC_PIMLICO_API_KEY).toBe('test-pimlico-key');
    });
  });

  describe('server-side validation', () => {
    it('should use serverEnvSchema when window is undefined', async () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error — simulate server environment by removing window
      delete globalThis.window;

      process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key';
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = 'test-wc-project-id';
      process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'test-privy-app-id';
      process.env.LIVEPEER_WEBHOOK_SECRET = 'test-webhook-secret';

      const { env } = await import('@/lib/config');
      expect(env.NEXT_PUBLIC_ALCHEMY_API_KEY).toBe('test-alchemy-key');

      globalThis.window = originalWindow;
    });
  });
});
