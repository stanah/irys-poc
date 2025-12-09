import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitNetwork } from "@lit-protocol/constants";
import { encryptFile, decryptToUint8Array } from "@lit-protocol/encryption";
import { SiweMessage } from "siwe";
import { type WalletClient, getAddress } from "viem";

export class LitService {
  private client: LitNodeClient;
  public chain: string;

  constructor(chain: string = "polygon") {
    this.chain = chain;
    this.client = new LitNodeClient({
      litNetwork: LitNetwork.DatilDev,
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
    const siweMessage = new SiweMessage({
      domain: window.location.host,
      address: checksumAddress,
      statement: "Sign in with Ethereum to the app.",
      uri: window.location.origin,
      version: "1",
      chainId: 137, // Polygon mainnet chain ID for Lit
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

export const litService = new LitService("polygon");
