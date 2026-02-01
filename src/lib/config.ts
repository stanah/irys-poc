import { z } from "zod";

export const siteConfig = {
  name: "DecentralizedVideo",
  description: "Decentralized video streaming platform with Livepeer, Lit Protocol, and Irys",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};

export const envSchema = z.object({
  NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().min(1, "Alchemy API Key is required"),
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().min(1, "WalletConnect Project ID is required"),
  NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID: z.string().optional(),
  // Livepeer
  NEXT_PUBLIC_LIVEPEER_API_KEY: z.string().optional(),
  LIVEPEER_WEBHOOK_SECRET: z.string().optional(),
  // Smart Contracts
  NEXT_PUBLIC_TIPPING_CONTRACT: z.string().optional(),
  NEXT_PUBLIC_PLATFORM_ADDRESS: z.string().optional(),
  NEXT_PUBLIC_PLATFORM_FEE_PERCENT: z.coerce.number().default(10),
});

// Helper to validate env in client
export const getEnv = () => {
  return {
    alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string,
    gasPolicyId: process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID,
    // Livepeer
    livepeerApiKey: process.env.NEXT_PUBLIC_LIVEPEER_API_KEY,
    // Contracts
    tippingContract: process.env.NEXT_PUBLIC_TIPPING_CONTRACT as `0x${string}` | undefined,
    platformAddress: process.env.NEXT_PUBLIC_PLATFORM_ADDRESS as `0x${string}` | undefined,
    platformFeePercent: Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT || 10),
  };
};
