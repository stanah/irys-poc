import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAccessControlConditions } from './encryption';

// Mock litService to avoid importing the actual Lit Protocol SDK
vi.mock('./lit', () => ({
  litService: {
    encryptFile: vi.fn(),
    decryptFile: vi.fn(),
    getAuthSig: vi.fn(),
    connect: vi.fn(),
  },
  LitService: vi.fn(),
}));

describe('encryption', () => {
  describe('generateAccessControlConditions', () => {
    describe('public access', () => {
      it('should generate ACC that allows any wallet address', () => {
        const conditions = generateAccessControlConditions('public');

        expect(conditions).toHaveLength(1);
        expect(conditions[0]).toEqual({
          contractAddress: '',
          chain: 'polygon',
          method: '',
          parameters: [':userAddress'],
          returnValueTest: {
            comparator: '!=',
            value: '0x0000000000000000000000000000000000000000',
          },
        });
      });

      it('should use custom chain when provided', () => {
        const conditions = generateAccessControlConditions('public', {
          chain: 'ethereum',
        });

        expect(conditions[0].chain).toBe('ethereum');
      });
    });

    describe('token-gated access', () => {
      it('should generate ERC721 ACC with NFT contract', () => {
        const nftContract = '0x1234567890abcdef1234567890abcdef12345678';
        const conditions = generateAccessControlConditions('token-gated', {
          nftContract,
        });

        expect(conditions).toHaveLength(1);
        expect(conditions[0]).toEqual({
          contractAddress: nftContract,
          standardContractType: 'ERC721',
          chain: 'polygon',
          method: 'balanceOf',
          parameters: [':userAddress'],
          returnValueTest: {
            comparator: '>',
            value: '0',
          },
        });
      });

      it('should throw when NFT contract is not provided', () => {
        expect(() =>
          generateAccessControlConditions('token-gated')
        ).toThrow('NFT contract address required for token-gated access');
      });

      it('should use custom chain for token-gated access', () => {
        const conditions = generateAccessControlConditions('token-gated', {
          nftContract: '0x1234567890abcdef1234567890abcdef12345678',
          chain: 'ethereum',
        });

        expect(conditions[0].chain).toBe('ethereum');
      });
    });

    describe('subscription access', () => {
      const subscriptionContract = '0xabcdef1234567890abcdef1234567890abcdef12';

      it('should generate subscription ACC', () => {
        const conditions = generateAccessControlConditions('subscription', {
          subscriptionContract,
        });

        expect(conditions).toHaveLength(1);
        expect(conditions[0]).toEqual({
          contractAddress: subscriptionContract,
          chain: 'polygon',
          method: 'isActiveSubscriber',
          parameters: [':userAddress'],
          returnValueTest: {
            comparator: '=',
            value: 'true',
          },
        });
      });

      it('should throw when subscription contract is not provided', () => {
        expect(() =>
          generateAccessControlConditions('subscription')
        ).toThrow(
          'Subscription contract address required for subscription access'
        );
      });

      it('should add creator bypass with OR condition', () => {
        const creatorAddress = '0x9876543210fedcba9876543210fedcba98765432';
        const conditions = generateAccessControlConditions('subscription', {
          subscriptionContract,
          creatorAddress,
        });

        expect(conditions).toHaveLength(3);
        // First condition: subscription check
        expect(conditions[0].method).toBe('isActiveSubscriber');
        // Second: OR operator
        expect((conditions[1] as any).operator).toBe('or');
        // Third: creator address check
        expect(conditions[2].returnValueTest.value).toBe(creatorAddress);
      });
    });

    describe('invalid access type', () => {
      it('should throw for unknown access type', () => {
        expect(() =>
          generateAccessControlConditions('unknown' as any)
        ).toThrow('Unknown access type: unknown');
      });
    });
  });
});
