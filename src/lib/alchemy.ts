import { createConfig } from "@account-kit/react";
import { alchemy, polygonAmoy } from "@account-kit/infra";
import { QueryClient } from "@tanstack/react-query";
import { getEnv } from "./config";

const env = getEnv();

export const config = createConfig({
  transport: alchemy({ apiKey: env.alchemyApiKey }),
  chain: polygonAmoy,
  ssr: true, 
  enablePopupOauth: true,
}, {
  auth: {
    sections: [[{"type": "email"}]],
    addPasskeyOnSignup: true,
  },
});

export const queryClient = new QueryClient();
