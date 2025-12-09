import { WebUploader } from "@irys/web-upload";
import { ViemV2Adapter } from "@irys/web-upload-ethereum-viem-v2";
import { createWalletClient, custom } from "viem";
import { polygonAmoy } from "viem/chains";

export class IrysService {
  async getWebIrys() {
    // Check if MetaMask or other wallet is available
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask or compatible wallet is required for uploads");
    }

    // Create a viem wallet client from window.ethereum
    const walletClient = createWalletClient({
      chain: polygonAmoy,
      transport: custom(window.ethereum),
    });

    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Connect to Irys Devnet
    const irys = await WebUploader(ViemV2Adapter as any)
      .withProvider(walletClient)
      .withRpc("https://rpc-amoy.polygon.technology")
      .devnet();

    return irys;
  }

  async uploadData(data: string, tags: { name: string; value: string }[]) {
    const irys = await this.getWebIrys();

    // Irys Devnet gives free uploads below 100KiB
    const receipt = await irys.upload(data, { tags });
    return receipt;
  }

  // Generic query using GraphQL
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

    const response = await fetch("https://devnet.irys.xyz/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const json = await response.json();
    return json.data.transactions.edges;
  }
}

export const irysService = new IrysService();
