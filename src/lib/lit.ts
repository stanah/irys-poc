import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitNetwork } from "@lit-protocol/constants";
import { encryptFile, decryptToUint8Array } from "@lit-protocol/encryption";
import { SiweMessage } from "siwe";

export class LitService {
  private client: LitNodeClient;
  public chain: string;

  constructor(chain: string = "amoy") {
    this.chain = chain;
    this.client = new LitNodeClient({
      litNetwork: LitNetwork.DatilDev,
      debug: false
    });
  }

  async connect() {
    if (!this.client.ready) {
        await this.client.connect();
    }
  }

  async getAuthSig(address: string, signer: any): Promise<any> {
    // Ensure chainId matches the chain we are using (Amoy = 80002)
    const siweMessage = new SiweMessage({
      domain: window.location.host,
      address: address,
      statement: "Sign in with Ethereum to the app.",
      uri: window.location.origin,
      version: "1",
      chainId: 80002, 
    });

    const messageToSign = siweMessage.prepareMessage();
    // Signer from Account Kit (viem) uses signMessage({ message })
    const signature = await signer.signMessage({ message: messageToSign });

    return {
      sig: signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: messageToSign,
      address: address,
    };
  }

  async encryptFile(file: File, accessControlConditions: any[], authSig: any) {
    await this.connect();
    const result = await encryptFile({
        file,
        accessControlConditions,
        chain: this.chain,
        authSig
    }, this.client);
    
    return result; 
  }

  async decryptFile(ciphertext: string, dataToEncryptHash: string, accessControlConditions: any[], authSig: any) {
    await this.connect();
    const result = await decryptToUint8Array({
        ciphertext,
        dataToEncryptHash,
        accessControlConditions,
        chain: this.chain,
        authSig
    }, this.client);
    
    return result;
  }
}

export const litService = new LitService("amoy");
