import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { ViemV2Adapter } from "@irys/web-upload-ethereum-viem-v2";
import { createWalletClient, createPublicClient, custom } from "viem";
import { polygonAmoy } from "viem/chains";

export class IrysService {
  async getWebIrys() {
    // Check if MetaMask or other wallet is available
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask or compatible wallet is required for uploads");
    }

    // Request account access
    const accounts = (await window.ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found");
    }

    // Create wallet client
    const walletClient = createWalletClient({
      account: accounts[0] as `0x${string}`,
      chain: polygonAmoy,
      transport: custom(window.ethereum),
    });

    // Create public client
    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: custom(window.ethereum),
    });

    // Connect to Irys using the proper adapter pattern
    const irysUploader = await WebUploader(WebEthereum).withAdapter(
      ViemV2Adapter(walletClient, { publicClient })
    );

    return irysUploader;
  }

  async uploadData(data: string, tags: { name: string; value: string }[]) {
    const irys = await this.getWebIrys();

    // Check balance before upload
    const dataSize = new TextEncoder().encode(data).length;
    const price = await irys.getPrice(dataSize);
    const balance = await irys.getBalance();

    // Use BigNumber comparison (.lt = less than)
    if (balance.lt(price)) {
      throw new Error(
        `Insufficient Irys balance. Required: ${irys.utils.fromAtomic(price)} ETH, ` +
        `Available: ${irys.utils.fromAtomic(balance)} ETH. Please fund your account.`
      );
    }

    const receipt = await irys.upload(data, { tags });
    return receipt;
  }

  async getBalance(): Promise<{ balance: string; formatted: string }> {
    const irys = await this.getWebIrys();
    const balance = await irys.getBalance();
    return {
      balance: balance.toString(),
      formatted: irys.utils.fromAtomic(balance).toString(),
    };
  }

  async fundAccount(amount: string): Promise<void> {
    const irys = await this.getWebIrys();
    await irys.fund(amount);
  }

  async getUploadPrice(dataSize: number): Promise<{ price: string; formatted: string }> {
    const irys = await this.getWebIrys();
    const price = await irys.getPrice(dataSize);
    return {
      price: price.toString(),
      formatted: irys.utils.fromAtomic(price).toString(),
    };
  }

  // Generic query using GraphQL - Irys mainnet/testnet
  async queryFiles(recipientAddress: string) {
    const query = `
      query {
        transactions(
          tags: [
            { name: "App-Name", values: ["SecureFileSharePoC"] },
            { name: "Recipient", values: ["${recipientAddress}"] }
          ]
          first: 20
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
              timestamp
            }
          }
        }
      }
    `;

    // Try mainnet gateway first, then devnet
    const response = await fetch("https://uploader.irys.xyz/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const json = await response.json();
    return json.data?.transactions?.edges || [];
  }
}

export const irysService = new IrysService();
