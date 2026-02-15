import type { WalletClient } from "viem";

export type ConnectionType = "aa" | "metamask" | null;

export type UnifiedWallet = {
  address: `0x${string}` | null;
  walletClient: WalletClient | null;
  connectionType: ConnectionType;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  smartAccountAddress: `0x${string}` | null;
  lastAttemptedMethod: ConnectionType;
  balance: bigint | null;
  isBalanceLoading: boolean;
  connectWithAA: () => Promise<void>;
  connectWithMetaMask: () => Promise<void>;
  disconnect: () => void;
};
