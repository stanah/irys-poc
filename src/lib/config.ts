import { z } from "zod";

export const siteConfig = {
  name: "SecureFileShare",
  description: "Secure file sharing with Irys, Lit, and Alchemy AA",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};

export const envSchema = z.object({
  NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().min(1, "Alchemy API Key is required"),
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().min(1, "WalletConnect Project ID is required"),
  NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID: z.string().optional(),
});

// Helper to validate env in client
export const getEnv = () => {
    // Note: In Next.js client-side, we can't iterate process.env dynamically for standard validation without a build-time step usually,
    // but specific access works. We'll just export values.
    return {
        alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY as string,
        walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string,
        gasPolicyId: process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID,
    }
}
