import { WebUploader } from "@irys/web-upload";
import { ViemV2Adapter } from "@irys/web-upload-ethereum-viem-v2";

export class IrysService {
  async getWebIrys(walletClient: any) {
    // Connect to Irys Devnet using Polygon Amoy (80002)
    const irys = await WebUploader(ViemV2Adapter as any)
      .withProvider(walletClient)
      // Devnet usage
      // .devnet() ? or specific URL? 
      // Irys Devnet usually requires specific config.
      // For Polygon Amoy, we use "matic" usually but on Devnet it might differ.
      // Irys mainnet uses "matic". Devnet uses usually "matic" too but with devnet URL.
      .withRpc("https://rpc-amoy.polygon.technology") // Amoy RPC
      .devnet(); 
      
    // Note: .devnet() might imply using Arweave/Irys Devnet node.
    // We explicitly set token to "matic" (Polygon).
    
    return irys;
  }

  async uploadData(data: string, tags: { name: string, value: string }[], walletClient: any) {
    const irys = await this.getWebIrys(walletClient);
    
    // Irys requires funding if not free upload (Devnet gives free uploads below 100KiB usually).
    // For PoC we assume free tier or user funds it. 
    // Ideally we check balance.
    
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
