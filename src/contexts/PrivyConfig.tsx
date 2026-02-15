"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { type PropsWithChildren, useSyncExternalStore } from "react";
import { env } from "@/lib/config";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function PrivyProviderWrapper({ children }: PropsWithChildren) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "passkey"],
        appearance: {
          theme: "light",
          accentColor: "#f97316",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
