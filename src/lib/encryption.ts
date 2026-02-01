import { litService, LitService } from "./lit";
import type {
  HLSManifest,
  HLSSegment,
  EncryptedSegment,
  AccessControlCondition,
} from "@/types/video";
import type { WalletClient } from "viem";

/**
 * Encrypt a single HLS segment using Lit Protocol
 */
export async function encryptSegment(
  segment: HLSSegment,
  accessControlConditions: AccessControlCondition[],
  authSig: ReturnType<typeof litService.getAuthSig> extends Promise<infer T>
    ? T
    : never
): Promise<EncryptedSegment> {
  if (!segment.data) {
    throw new Error("Segment data is required for encryption");
  }

  // Convert ArrayBuffer to File for Lit Protocol
  const blob = new Blob([segment.data], { type: "video/mp2t" });
  const file = new File([blob], segment.uri, { type: "video/mp2t" });

  const result = await litService.encryptFile(
    file,
    accessControlConditions as any[],
    authSig
  );

  return {
    uri: segment.uri,
    ciphertext: result.ciphertext,
    dataToEncryptHash: result.dataToEncryptHash,
  };
}

/**
 * Encrypt all segments in an HLS manifest
 */
export async function encryptHlsManifest(
  manifest: HLSManifest,
  accessControlConditions: AccessControlCondition[],
  walletClient: WalletClient,
  address: string,
  onProgress?: (current: number, total: number) => void
): Promise<{
  encryptedRenditions: {
    quality: string;
    bandwidth: number;
    playlist: string;
    encryptedSegments: EncryptedSegment[];
  }[];
  authSig: unknown;
}> {
  // Get auth signature once for all encryptions
  const authSig = await litService.getAuthSig(address, walletClient);

  const encryptedRenditions = [];
  let processedSegments = 0;
  const totalSegments = manifest.renditions.reduce(
    (sum, r) => sum + r.segments.length,
    0
  );

  for (const rendition of manifest.renditions) {
    const encryptedSegments: EncryptedSegment[] = [];

    for (const segment of rendition.segments) {
      const encrypted = await encryptSegment(
        segment,
        accessControlConditions,
        authSig
      );
      encryptedSegments.push(encrypted);

      processedSegments++;
      onProgress?.(processedSegments, totalSegments);
    }

    // Update playlist to reference encrypted segments by index
    const updatedPlaylist = updatePlaylistReferences(
      rendition.playlist,
      encryptedSegments
    );

    encryptedRenditions.push({
      quality: rendition.quality,
      bandwidth: rendition.bandwidth,
      playlist: updatedPlaylist,
      encryptedSegments,
    });
  }

  return { encryptedRenditions, authSig };
}

/**
 * Update HLS playlist to reference encrypted segment indices
 */
function updatePlaylistReferences(
  playlist: string,
  encryptedSegments: EncryptedSegment[]
): string {
  const lines = playlist.split("\n");
  const result: string[] = [];
  let segmentIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed && !trimmed.startsWith("#")) {
      // Replace segment URL with index reference
      result.push(`segment_${segmentIndex}.enc`);
      segmentIndex++;
    } else {
      result.push(line);
    }
  }

  return result.join("\n");
}

/**
 * Decrypt a single HLS segment
 */
export async function decryptSegment(
  encryptedSegment: EncryptedSegment,
  accessControlConditions: AccessControlCondition[],
  authSig: unknown
): Promise<ArrayBuffer> {
  const decrypted = await litService.decryptFile(
    encryptedSegment.ciphertext,
    encryptedSegment.dataToEncryptHash,
    accessControlConditions as any[],
    authSig
  );

  return decrypted.buffer as ArrayBuffer;
}

/**
 * Generate Access Control Conditions for different access types
 */
export function generateAccessControlConditions(
  accessType: "public" | "token-gated" | "subscription",
  options: {
    chain?: string;
    nftContract?: string;
    subscriptionContract?: string;
    minTokenBalance?: string;
    creatorAddress?: string;
  } = {}
): AccessControlCondition[] {
  const chain = options.chain || "polygon";

  switch (accessType) {
    case "public":
      // Public: any wallet address can access
      return [
        {
          contractAddress: "",
          chain,
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "!=",
            value: "0x0000000000000000000000000000000000000000",
          },
        },
      ];

    case "token-gated":
      // NFT-gated: must hold specific NFT
      if (!options.nftContract) {
        throw new Error("NFT contract address required for token-gated access");
      }
      return [
        {
          contractAddress: options.nftContract,
          standardContractType: "ERC721",
          chain,
          method: "balanceOf",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: ">",
            value: "0",
          },
        },
      ];

    case "subscription":
      // Subscription: must be active subscriber OR creator
      if (!options.subscriptionContract) {
        throw new Error(
          "Subscription contract address required for subscription access"
        );
      }
      const conditions: (AccessControlCondition | { operator: string })[] = [
        {
          contractAddress: options.subscriptionContract,
          chain,
          method: "isActiveSubscriber",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: "true",
          },
        },
      ];

      // Add creator bypass if provided
      if (options.creatorAddress) {
        conditions.push(
          { operator: "or" },
          {
            contractAddress: "",
            chain,
            method: "",
            parameters: [":userAddress"],
            returnValueTest: {
              comparator: "=",
              value: options.creatorAddress,
            },
          }
        );
      }

      return conditions as AccessControlCondition[];

    default:
      throw new Error(`Unknown access type: ${accessType}`);
  }
}

/**
 * Create a custom decryption worker for hls.js integration
 */
export function createDecryptionLoader(
  accessControlConditions: AccessControlCondition[],
  authSig: unknown,
  encryptedSegments: Map<string, EncryptedSegment>
) {
  return class DecryptionLoader {
    private context: any;
    private config: any;

    constructor(config: any) {
      this.config = config;
    }

    destroy() {
      // Cleanup if needed
    }

    abort() {
      // Abort if needed
    }

    async load(context: any, config: any, callbacks: any) {
      this.context = context;

      const url = context.url;
      const segmentKey = url.split("/").pop();

      // Check if this is an encrypted segment
      const encrypted = encryptedSegments.get(segmentKey);

      if (encrypted) {
        try {
          const decrypted = await decryptSegment(
            encrypted,
            accessControlConditions,
            authSig
          );

          callbacks.onSuccess(
            {
              url: context.url,
              data: decrypted,
            },
            {},
            context
          );
        } catch (error) {
          callbacks.onError(
            { code: 2, text: "Decryption failed" },
            context,
            null
          );
        }
      } else {
        // Not encrypted, use default fetch
        try {
          const response = await fetch(url);
          const data = await response.arrayBuffer();

          callbacks.onSuccess(
            {
              url: context.url,
              data,
            },
            {},
            context
          );
        } catch (error) {
          callbacks.onError(
            { code: 2, text: "Fetch failed" },
            context,
            null
          );
        }
      }
    }
  };
}
