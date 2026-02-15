import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { ViemV2Adapter } from "@irys/web-upload-ethereum-viem-v2";
import { createWalletClient, createPublicClient, custom } from "viem";
import { polygonAmoy } from "viem/chains";
import { getEnv } from "./config";
import type { IrysService as IrysServiceInterface } from "@/types/services";
import type { Result, AppError } from "@/types/errors";

import type { VideoListItem, VideoCategory, AccessType } from "@/types/video";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebUploaderInstance = any;

interface GraphQLEdge {
  node: {
    id: string;
    tags: { name: string; value: string }[];
    timestamp: number;
  };
  cursor: string;
}

function parseGraphQLToVideoListItem(edge: GraphQLEdge): VideoListItem {
  const tags = new Map(edge.node.tags.map(t => [t.name, t.value]));
  return {
    id: edge.node.id,
    title: tags.get('Title') || 'Untitled',
    thumbnailCid: tags.get('ThumbnailCid') || '',
    duration: Number(tags.get('Duration') || 0),
    creatorAddress: tags.get('Creator') || '',
    createdAt: edge.node.timestamp,
    category: (tags.get('Category') || 'other') as VideoCategory,
    accessType: (tags.get('AccessType') || 'public') as AccessType,
    totalTips: BigInt(0),
  };
}

export class IrysServiceImpl implements IrysServiceInterface {
  private static readonly TIMEOUT_MS = 15_000; // NFR-I3: Irys 15秒

  private createAbortError(): AppError {
    return {
      category: 'irys',
      code: 'ABORTED',
      message: '操作がキャンセルされました',
      retryable: true,
    };
  }

  private async getWebIrys(
    options?: { signal?: AbortSignal }
  ): Promise<Result<WebUploaderInstance>> {
    if (options?.signal?.aborted) {
      return { success: false, error: this.createAbortError() };
    }

    try {
      if (typeof window === "undefined" || !window.ethereum) {
        return {
          success: false,
          error: {
            category: 'irys',
            code: 'WALLET_REQUIRED',
            message: 'MetaMaskまたは互換ウォレットが必要です',
            retryable: false,
          },
        };
      }

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts || accounts.length === 0) {
        return {
          success: false,
          error: {
            category: 'irys',
            code: 'WALLET_REQUIRED',
            message: 'ウォレットアカウントが見つかりません',
            retryable: false,
          },
        };
      }

      const walletClient = createWalletClient({
        account: accounts[0] as `0x${string}`,
        chain: polygonAmoy,
        transport: custom(window.ethereum),
      });

      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: custom(window.ethereum),
      });

      const irysUploader = await WebUploader(WebEthereum).withAdapter(
        ViemV2Adapter(walletClient, { publicClient })
      );

      return { success: true, data: irysUploader };
    } catch (e) {
      return {
        success: false,
        error: {
          category: 'irys',
          code: 'INIT_FAILED',
          message: 'Irysストレージへの接続に失敗しました',
          retryable: true,
          cause: e,
        },
      };
    }
  }

  async uploadData(
    data: string,
    tags: { name: string; value: string }[],
    options?: { signal?: AbortSignal }
  ): Promise<Result<{ id: string }>> {
    if (options?.signal?.aborted) {
      return { success: false, error: this.createAbortError() };
    }

    const irysResult = await this.getWebIrys(options);
    if (!irysResult.success) return irysResult;
    const irys = irysResult.data;

    try {
      const dataSize = new TextEncoder().encode(data).length;
      const price = await irys.getPrice(dataSize);
      const balance = await irys.getBalance();

      if (balance.lt(price)) {
        return {
          success: false,
          error: {
            category: 'irys',
            code: 'INSUFFICIENT_FUNDS',
            message: `ストレージ残高が不足しています。必要額: ${irys.utils.fromAtomic(price)} ETH、現在残高: ${irys.utils.fromAtomic(balance)} ETH`,
            retryable: false,
          },
        };
      }

      if (options?.signal?.aborted) {
        return { success: false, error: this.createAbortError() };
      }

      const timeoutSignal = AbortSignal.timeout(IrysServiceImpl.TIMEOUT_MS);
      const receipt = await Promise.race([
        irys.upload(data, { tags }),
        new Promise<never>((_, reject) => {
          timeoutSignal.addEventListener('abort', () =>
            reject(new DOMException('Timeout', 'TimeoutError')),
            { once: true }
          );
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          );
        }),
      ]);

      return { success: true, data: { id: receipt.id } };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'TimeoutError') {
        return {
          success: false,
          error: {
            category: 'irys',
            code: 'UPLOAD_FAILED',
            message: 'Irysへのアップロードがタイムアウトしました',
            retryable: true,
            cause: e,
          },
        };
      }
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { success: false, error: this.createAbortError() };
      }
      return {
        success: false,
        error: {
          category: 'irys',
          code: 'UPLOAD_FAILED',
          message: 'Irysへのアップロードに失敗しました',
          retryable: true,
          cause: e,
        },
      };
    }
  }

  async getBalance(
    options?: { signal?: AbortSignal }
  ): Promise<Result<{ balance: string; formatted: string }>> {
    if (options?.signal?.aborted) {
      return { success: false, error: this.createAbortError() };
    }

    const irysResult = await this.getWebIrys(options);
    if (!irysResult.success) return irysResult;
    const irys = irysResult.data;

    try {
      const timeoutSignal = AbortSignal.timeout(IrysServiceImpl.TIMEOUT_MS);
      const balance = await Promise.race([
        irys.getBalance(),
        new Promise<never>((_, reject) => {
          timeoutSignal.addEventListener('abort', () =>
            reject(new DOMException('Timeout', 'TimeoutError')),
            { once: true }
          );
        }),
      ]);
      return {
        success: true,
        data: {
          balance: balance.toString(),
          formatted: irys.utils.fromAtomic(balance).toString(),
        },
      };
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
        return { success: false, error: this.createAbortError() };
      }
      return {
        success: false,
        error: {
          category: 'irys',
          code: 'QUERY_FAILED',
          message: '残高の取得に失敗しました',
          retryable: true,
          cause: e,
        },
      };
    }
  }

  async deposit(
    amount: string,
    options?: { signal?: AbortSignal }
  ): Promise<Result<void>> {
    if (options?.signal?.aborted) {
      return { success: false, error: this.createAbortError() };
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return {
        success: false,
        error: {
          category: 'irys',
          code: 'INVALID_AMOUNT',
          message: '無効なデポジット額です',
          retryable: false,
        },
      };
    }

    const startMs = Date.now();

    const irysResult = await this.getWebIrys(options);
    if (!irysResult.success) return irysResult;
    const irys = irysResult.data;

    try {
      const timeoutSignal = AbortSignal.timeout(IrysServiceImpl.TIMEOUT_MS);
      await Promise.race([
        irys.fund(amount),
        new Promise<never>((_, reject) => {
          timeoutSignal.addEventListener('abort', () =>
            reject(new DOMException('Timeout', 'TimeoutError')),
            { once: true }
          );
        }),
      ]);

      const durationMs = Date.now() - startMs;
      console.log(
        `[METRIC] event=irys_deposit, amount_eth=${amount}, duration_ms=${durationMs}, timestamp=${new Date().toISOString()}`
      );

      return { success: true, data: undefined };
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
        return { success: false, error: this.createAbortError() };
      }
      return {
        success: false,
        error: {
          category: 'irys',
          code: 'DEPOSIT_FAILED',
          message: 'デポジットに失敗しました',
          retryable: true,
          cause: e,
        },
      };
    }
  }

  async queryFiles(
    recipientAddress: string,
    options?: { signal?: AbortSignal }
  ): Promise<Result<unknown[]>> {
    if (options?.signal?.aborted) {
      return { success: false, error: this.createAbortError() };
    }

    // Validate address format when provided (empty = all videos)
    if (recipientAddress && !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      return {
        success: false,
        error: {
          category: 'irys',
          code: 'QUERY_FAILED',
          message: '無効なウォレットアドレスです',
          retryable: false,
        },
      };
    }

    const startMs = Date.now();

    // Build tags array: base tags always present, Creator tag only when address specified
    const tags: { name: string; values: string[] }[] = [
      { name: "AppName", values: ["DecentralizedVideo"] },
      { name: "Type", values: ["video-metadata"] },
    ];

    if (recipientAddress) {
      tags.push({ name: "Creator", values: [recipientAddress] });
    }

    const tagsString = tags
      .map(t => `{ name: ${JSON.stringify(t.name)}, values: ${JSON.stringify(t.values)} }`)
      .join(', ');

    const query = `
      query {
        transactions(
          tags: [${tagsString}]
          first: 20
          order: DESC
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
            cursor
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    try {
      const graphqlEndpoint = getEnv().irysGraphqlEndpoint;
      const timeoutSignal = AbortSignal.timeout(IrysServiceImpl.TIMEOUT_MS);
      const combinedSignal = options?.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

      const response = await fetch(graphqlEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: combinedSignal,
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            category: 'irys',
            code: 'QUERY_FAILED',
            message: '動画一覧の取得に失敗しました',
            retryable: true,
          },
        };
      }

      const json = await response.json();

      if (json.errors && json.errors.length > 0) {
        return {
          success: false,
          error: {
            category: 'irys',
            code: 'QUERY_FAILED',
            message: '動画一覧の取得に失敗しました',
            retryable: true,
            cause: json.errors,
          },
        };
      }

      const edges = json.data?.transactions?.edges || [];

      const items = edges.map((edge: GraphQLEdge) =>
        parseGraphQLToVideoListItem(edge)
      );

      const durationMs = Date.now() - startMs;
      console.log(
        `[METRIC] event=irys_query, filter_creator=${recipientAddress || 'all'}, result_count=${items.length}, duration_ms=${durationMs}, timestamp=${new Date().toISOString()}`
      );

      return {
        success: true,
        data: items,
      };
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
        return { success: false, error: this.createAbortError() };
      }
      return {
        success: false,
        error: {
          category: 'irys',
          code: 'QUERY_FAILED',
          message: '動画一覧の取得に失敗しました',
          retryable: true,
          cause: e,
        },
      };
    }
  }

  async getMetadata(
    transactionId: string,
    options?: { signal?: AbortSignal }
  ): Promise<Result<unknown>> {
    if (options?.signal?.aborted) {
      return { success: false, error: this.createAbortError() };
    }

    // Validate transactionId format (alphanumeric + hyphens)
    if (!/^[a-zA-Z0-9_-]+$/.test(transactionId)) {
      return {
        success: false,
        error: {
          category: 'irys',
          code: 'METADATA_NOT_FOUND',
          message: '無効なトランザクションIDです',
          retryable: false,
        },
      };
    }

    const startMs = Date.now();

    try {
      const timeoutSignal = AbortSignal.timeout(IrysServiceImpl.TIMEOUT_MS);
      const combinedSignal = options?.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal;

      const response = await fetch(`https://gateway.irys.xyz/${transactionId}`, {
        signal: combinedSignal,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: {
              category: 'irys',
              code: 'METADATA_NOT_FOUND',
              message: 'メタデータが見つかりません',
              retryable: false,
            },
          };
        }
        return {
          success: false,
          error: {
            category: 'irys',
            code: 'METADATA_FETCH_FAILED',
            message: 'メタデータの取得に失敗しました',
            retryable: true,
          },
        };
      }

      const metadata = await response.json();

      const durationMs = Date.now() - startMs;
      console.log(
        `[METRIC] event=metadata_fetch, video_id=${transactionId}, duration_ms=${durationMs}, timestamp=${new Date().toISOString()}`
      );

      return { success: true, data: metadata };
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
        return { success: false, error: this.createAbortError() };
      }
      return {
        success: false,
        error: {
          category: 'irys',
          code: 'METADATA_FETCH_FAILED',
          message: 'メタデータの取得に失敗しました',
          retryable: true,
          cause: e,
        },
      };
    }
  }

}

export const irysServiceImpl = new IrysServiceImpl();

// 後方互換: video.ts 等の既存コードが参照している
export const irysService = irysServiceImpl;
