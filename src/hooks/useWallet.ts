"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createWalletClient, createPublicClient, custom, http, type WalletClient } from "viem";
import { polygonAmoy } from "viem/chains";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { toSimpleSmartAccount } from "permissionless/accounts";
import type { ConnectionType, UnifiedWallet } from "@/types/wallet";

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const POLYGON_AMOY_CHAIN_ID = "0x13882"; // 80002

// wallet_addEthereumChain requires this specific format (separate from viem's polygonAmoy chain config)
const POLYGON_AMOY_NETWORK = {
  chainId: POLYGON_AMOY_CHAIN_ID,
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: ["https://rpc-amoy.polygon.technology/"],
  blockExplorerUrls: ["https://amoy.polygonscan.com/"],
};

interface WalletState {
  address: `0x${string}` | null;
  walletClient: WalletClient | null;
  connectionType: ConnectionType;
  isConnecting: boolean;
  error: string | null;
  smartAccountAddress: `0x${string}` | null;
  lastAttemptedMethod: ConnectionType;
  balance: bigint | null;
  isBalanceLoading: boolean;
}

const initialState: WalletState = {
  address: null,
  walletClient: null,
  connectionType: null,
  isConnecting: false,
  error: null,
  smartAccountAddress: null,
  lastAttemptedMethod: null,
  balance: null,
  isBalanceLoading: false,
};

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});

export function useWallet(): UnifiedWallet {
  const [state, setState] = useState<WalletState>(initialState);
  const { ready: privyReady, authenticated, logout: privyLogout, login: privyLogin } = usePrivy();
  const { wallets } = useWallets();

  // H1 fix: Track AA login attempt to detect Privy modal dismiss.
  // useLogin hook is SSR-unsafe (crashes during Next.js static generation),
  // so we use authenticated state polling as a fallback.
  const aaLoginPending = useRef(false);
  // H1 fix (Story 1.4 review): Track balance fetch generation to discard stale results
  const balanceFetchId = useRef(0);

  useEffect(() => {
    if (!aaLoginPending.current) return;
    if (authenticated) {
      // Success — AA setup useEffect will handle the rest
      aaLoginPending.current = false;
      return;
    }
    // Privy modal may still be open; poll until authenticated or timeout
    const timer = setTimeout(() => {
      if (aaLoginPending.current && !authenticated) {
        aaLoginPending.current = false;
        setState((prev) => {
          if (prev.isConnecting && prev.lastAttemptedMethod === "aa") {
            return { ...prev, isConnecting: false };
          }
          return prev;
        });
      }
    }, 120_000); // 2min safety timeout for long Privy auth flows

    return () => clearTimeout(timer);
  }, [authenticated]);

  const fetchBalance = useCallback(async (walletAddress: `0x${string}`) => {
    const id = ++balanceFetchId.current;
    setState((prev) => ({ ...prev, isBalanceLoading: true }));
    try {
      const balance = await publicClient.getBalance({ address: walletAddress });
      if (id !== balanceFetchId.current) return;
      setState((prev) => ({ ...prev, balance, isBalanceLoading: false }));
    } catch (err: unknown) {
      if (id !== balanceFetchId.current) return;
      console.warn("Balance fetch failed:", err instanceof Error ? err.message : err);
      setState((prev) => ({ ...prev, balance: null, isBalanceLoading: false }));
    }
  }, []);

  // M2 fix: Stabilize dependency — use primitive address instead of wallets array reference
  const embeddedWalletAddress = wallets.find((w) => w.walletClientType === "privy")?.address;

  // Sync AA wallet state when Privy authentication changes
  useEffect(() => {
    if (!privyReady || !authenticated || state.connectionType === "metamask") return;

    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
    if (!embeddedWallet) return;

    let cancelled = false;

    const setupAAWallet = async () => {
      try {
        const provider = await embeddedWallet.getEthereumProvider();
        const eoaAddress = embeddedWallet.address as `0x${string}`;

        // M1: Privy EIP1193Provider → permissionless.js owner adapter.
        // Required because Privy's provider type doesn't exactly match permissionless.js expectations.
        // If permissionless.js changes the owner interface, this will need updating.
        const owner = {
          request: (args: { method: string; params?: unknown[] }) =>
            provider.request(args) as Promise<unknown>,
        };
        const smartAccount = await toSimpleSmartAccount({
          client: publicClient,
          owner,
        });

        if (cancelled) return;

        const walletClient = createWalletClient({
          account: eoaAddress,
          chain: polygonAmoy,
          transport: custom(provider),
        });

        setState({
          address: eoaAddress,
          walletClient,
          connectionType: "aa",
          isConnecting: false,
          error: null,
          smartAccountAddress: smartAccount.address,
          lastAttemptedMethod: "aa",
          balance: null,
          isBalanceLoading: false,
        });
        fetchBalance(eoaAddress);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to setup AA wallet";
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: message,
        }));
      }
    };

    setupAAWallet();

    return () => {
      cancelled = true;
    };
  }, [privyReady, authenticated, embeddedWalletAddress, state.connectionType, wallets, fetchBalance]);

  const connectWithAA = useCallback(async () => {
    if (!privyReady) {
      setState((prev) => ({ ...prev, error: "Privy is not ready", lastAttemptedMethod: "aa" }));
      return;
    }

    aaLoginPending.current = true;
    setState((prev) => ({ ...prev, isConnecting: true, error: null, lastAttemptedMethod: "aa" }));
    privyLogin();
  }, [privyReady, privyLogin]);

  const connectWithMetaMask = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setState((prev) => ({
        ...prev,
        error: "MetaMask is not installed",
        lastAttemptedMethod: "metamask",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null, lastAttemptedMethod: "metamask" }));

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // M3 fix: Validate address at system boundary
      const rawAddress = accounts[0];
      if (!ETH_ADDRESS_RE.test(rawAddress)) {
        throw new Error("Invalid Ethereum address returned from wallet");
      }

      // Network validation: ensure Polygon Amoy (Story 1.3)
      const chainIdRaw = await window.ethereum.request({ method: "eth_chainId" });
      const chainId = typeof chainIdRaw === "string" ? chainIdRaw : String(chainIdRaw);
      if (chainId !== POLYGON_AMOY_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: POLYGON_AMOY_CHAIN_ID }],
          });
        } catch (switchError: unknown) {
          if ((switchError as { code?: number }).code === 4902) {
            try {
              await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [POLYGON_AMOY_NETWORK],
              });
            } catch {
              throw new Error("Polygon Amoyテストネットの追加に失敗しました");
            }
          } else {
            throw new Error("Polygon Amoyテストネットへの切り替えに失敗しました");
          }
        }
      }

      const walletClient = createWalletClient({
        chain: polygonAmoy,
        transport: custom(window.ethereum),
      });

      const connectedAddress = rawAddress as `0x${string}`;
      setState({
        address: connectedAddress,
        walletClient,
        connectionType: "metamask",
        isConnecting: false,
        error: null,
        smartAccountAddress: null,
        lastAttemptedMethod: "metamask",
        balance: null,
        isBalanceLoading: false,
      });
      fetchBalance(connectedAddress);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
    }
  }, [fetchBalance]);

  const disconnect = useCallback(() => {
    aaLoginPending.current = false;
    if (state.connectionType === "aa" && authenticated) {
      privyLogout();
    }
    // NFR-S6: Litセッション署名のクリア（LitService統合時に実装）
    // TODO: litService.clearSession() を呼び出す（Epic 4 Story 4.1で実装予定）
    setState(initialState);
  }, [state.connectionType, authenticated, privyLogout]);

  // Listen for MetaMask account changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    if (state.connectionType !== "metamask") return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        disconnect();
      } else if (accs[0] !== state.address) {
        connectWithMetaMask();
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      if ((chainId as string) !== POLYGON_AMOY_CHAIN_ID) {
        aaLoginPending.current = false;
        setState({
          ...initialState,
          error: "ネットワークがPolygon Amoyから変更されたため、切断されました",
          lastAttemptedMethod: "metamask",
        });
      }
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [state.address, state.connectionType, connectWithMetaMask, disconnect]);

  return {
    ...state,
    isConnected: !!state.address,
    connectWithAA,
    connectWithMetaMask,
    disconnect,
  };
}
