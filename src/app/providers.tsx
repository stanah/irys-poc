"use client";

import { PropsWithChildren } from "react";
import { WalletProvider } from "@/contexts/WalletContext";

export const Providers = ({ children }: PropsWithChildren) => {
  return <WalletProvider>{children}</WalletProvider>;
};
