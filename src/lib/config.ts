import { z } from "zod";

const ethAddressSchema = z.string().regex(
  /^0x[a-fA-F0-9]{40}$/,
  "Must be a valid Ethereum address (0x + 40 hex characters)",
);

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_ALCHEMY_API_KEY: z.string().min(1, "Alchemy API Key is required"),
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().min(1, "WalletConnect Project ID is required"),
  NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID: z.string().optional(),
  NEXT_PUBLIC_LIVEPEER_API_KEY: z.string().optional(),
  NEXT_PUBLIC_TIPPING_CONTRACT: ethAddressSchema.optional(),
  NEXT_PUBLIC_PLATFORM_ADDRESS: ethAddressSchema.optional(),
  NEXT_PUBLIC_PLATFORM_FEE_PERCENT: z.coerce.number().default(10),
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1, "Privy App ID is required"),
  NEXT_PUBLIC_PIMLICO_API_KEY: z.string().optional(),
  NEXT_PUBLIC_IRYS_GRAPHQL_ENDPOINT: z.string().url().default('https://uploader.irys.xyz/graphql'),
});

const serverEnvSchema = clientEnvSchema.extend({
  LIVEPEER_WEBHOOK_SECRET: z.string().optional(),
});

function validateEnv() {
  const isServer = typeof window === 'undefined';
  const schema = isServer ? serverEnvSchema : clientEnvSchema;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  return result.data;
}

export const env = validateEnv();

export const siteConfig = {
  name: "DecentralizedVideo",
  description: "Decentralized video streaming platform with Livepeer, Lit Protocol, and Irys",
  url: env.NEXT_PUBLIC_APP_URL,
};

export const getEnv = () => {
  return {
    alchemyApiKey: env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    walletConnectProjectId: env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    gasPolicyId: env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID,
    livepeerApiKey: env.NEXT_PUBLIC_LIVEPEER_API_KEY,
    // Safe narrowing: ethAddressSchema validates 0x hex format at startup
    tippingContract: env.NEXT_PUBLIC_TIPPING_CONTRACT as `0x${string}` | undefined,
    platformAddress: env.NEXT_PUBLIC_PLATFORM_ADDRESS as `0x${string}` | undefined,
    platformFeePercent: env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT,
    irysGraphqlEndpoint: env.NEXT_PUBLIC_IRYS_GRAPHQL_ENDPOINT,
  };
};
