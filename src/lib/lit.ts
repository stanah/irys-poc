import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { encryptFile, decryptToUint8Array } from "@lit-protocol/encryption";
import { SiweMessage } from "siwe";
import { type WalletClient, getAddress } from "viem";
import { polygonAmoy } from "viem/chains";

// Lit Network constant
const LIT_NETWORK = "datil-dev" as const;

export class LitService {
  private client: LitNodeClient;
  public chain: string;

  constructor(chain: string = "polygonAmoy") {
    this.chain = chain;
    this.client = new LitNodeClient({
      litNetwork: LIT_NETWORK,
      debug: false,
    });
  }

  async connect() {
    if (!this.client.ready) {
      await this.client.connect();
    }
  }

  async getAuthSig(address: string, walletClient: WalletClient): Promise<any> {
    // Convert address to checksummed format (EIP-55)
    const checksumAddress = getAddress(address);
    
    // Create expiration time (1 hour from now)
    const now = new Date();
    const expirationTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    
    const siweMessage = new SiweMessage({
      domain: window.location.host,
      address: checksumAddress,
      statement: "Sign in with Ethereum to the app.",
      uri: window.location.origin,
      version: "1",
      chainId: polygonAmoy.id, // Polygon Amoy testnet chain ID
      issuedAt: now.toISOString(),
      expirationTime: expirationTime,
    });

    const messageToSign = siweMessage.prepareMessage();

    // Sign with MetaMask via viem wallet client
    const signature = await walletClient.signMessage({
      account: checksumAddress as `0x${string}`,
      message: messageToSign,
    });

    return {
      sig: signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: messageToSign,
      address: checksumAddress,
    };
  }

  async encryptFile(file: File, accessControlConditions: any[], authSig: any) {
    await this.connect();
    const result = await encryptFile(
      {
        file,
        accessControlConditions,
        chain: this.chain,
        authSig,
      },
      this.client
    );

    return result;
  }

  async decryptFile(
    ciphertext: string,
    dataToEncryptHash: string,
    accessControlConditions: any[],
    authSig: any
  ) {
    await this.connect();
    const result = await decryptToUint8Array(
      {
        ciphertext,
        dataToEncryptHash,
        accessControlConditions,
        chain: this.chain,
        authSig,
      },
      this.client
    );

    return result;
  }
}

export const litService = new LitService("polygonAmoy");
