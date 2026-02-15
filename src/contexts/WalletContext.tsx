"use client";

import { createContext, useContext, PropsWithChildren } from "react";
import { useWallet } from "@/hooks/useWallet";
import type { UnifiedWallet } from "@/types/wallet";

const WalletContext = createContext<UnifiedWallet | null>(null);

export function WalletProvider({ children }: PropsWithChildren) {
  const wallet = useWallet();
  return (
    <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
  );
}

export function useWalletContext(): UnifiedWallet {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within WalletProvider");
  }
  return context;
}
