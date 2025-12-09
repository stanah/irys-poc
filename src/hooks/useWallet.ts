"use client";

import { useState, useEffect, useCallback } from "react";
import { createWalletClient, custom, type WalletClient } from "viem";
import { polygonAmoy } from "viem/chains";

interface WalletState {
  address: string | null;
  walletClient: WalletClient | null;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    walletClient: null,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setState((prev) => ({
        ...prev,
        error: "MetaMask is not installed",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request account access
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      // Create wallet client
      const walletClient = createWalletClient({
        chain: polygonAmoy,
        transport: custom(window.ethereum),
      });

      setState({
        address: accounts[0],
        walletClient,
        isConnecting: false,
        error: null,
      });
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err.message || "Failed to connect",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      walletClient: null,
      isConnecting: false,
      error: null,
    });
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        disconnect();
      } else if (accs[0] !== state.address) {
        connect();
      }
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, [state.address, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    isConnected: !!state.address,
  };
}
