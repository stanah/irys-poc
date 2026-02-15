"use client";

import { PropsWithChildren } from "react";
import { PrivyProviderWrapper } from "@/contexts/PrivyConfig";
import { WalletProvider } from "@/contexts/WalletContext";
import { composeProviders } from "@/lib/compose-providers";

const ComposedProviders = composeProviders([
  PrivyProviderWrapper,
  WalletProvider,
]);

export const Providers = ({ children }: PropsWithChildren) => {
  return <ComposedProviders>{children}</ComposedProviders>;
};
