# Story 2.5: 動画一覧とタグ・カテゴリフィルタリング

Status: ready-for-dev

## Story

As a **ユーザー**,
I want **プラットフォーム上の動画を一覧で閲覧し、タグやカテゴリで絞り込む**,
so that **興味のあるコンテンツを効率的に見つけられる**.

## Acceptance Criteria (BDD)

### AC1: 動画一覧のカード形式表示

**Given** トップページにアクセスした状態
**When** ページが読み込まれる
**Then** 公開動画の一覧がカード形式で表示される（FR31）
**And** 各カードに公開/限定の区別バッジが表示される（FR33）

### AC2: カテゴリフィルタリング

**Given** 動画一覧が表示された状態
**When** カテゴリフィルターを選択する
**Then** 選択したカテゴリの動画のみが表示される（FR32）
**And** Irys GraphQLのタグフィルタリングが使用される

### AC3: クリエイター別絞り込み（チャンネルページ）

**Given** 動画一覧が表示された状態
**When** クリエイターアドレスで絞り込む（チャンネルページアクセス）
**Then** そのクリエイターの動画のみが表示される（FR34）

## Tasks / Subtasks

- [ ] **Task 1: IrysServiceImpl queryFilesの強化** (AC: #1, #2, #3)
  - [ ] 1.1 `src/lib/irys.ts`の`queryFiles`メソッドをフィルタ対応に書き換え
  - [ ] 1.2 引数を`VideoQueryParams`互換に拡張: `creatorAddress?`, `category?`, `accessType?`, `tags?`
  - [ ] 1.3 GraphQLクエリにカテゴリタグフィルタ追加: `{ name: "Category", values: [category] }`（category指定時のみ）
  - [ ] 1.4 GraphQLクエリにアクセスタイプタグフィルタ追加: `{ name: "AccessType", values: [accessType] }`（accessType指定時のみ）
  - [ ] 1.5 GraphQLクエリにクリエイタータグフィルタ追加: `{ name: "Creator", values: [address] }`（creatorAddress指定時のみ）
  - [ ] 1.6 ベースタグ: `{ name: "AppName", values: ["DecentralizedVideo"] }` + `{ name: "Type", values: ["video-metadata"] }`
  - [ ] 1.7 ページネーション: `first: 20`, `after: cursor`パラメータ対応
  - [ ] 1.8 レスポンスを`VideoListItem[]`に変換: GraphQLのtags情報からインライン構築
  - [ ] 1.9 `[METRIC]`構造化ログ: `event=irys_query, filter_category=X, result_count=Y, duration_ms=Z`

- [ ] **Task 2: useVideoListフック作成** (AC: #1, #2)
  - [ ] 2.1 `src/hooks/useVideoList.ts`を新規作成
  - [ ] 2.2 `useServiceContext()`経由でIrysServiceを取得
  - [ ] 2.3 `fetchVideos(params?: VideoQueryParams)`: `irys.queryFiles`呼び出し + Result型ハンドリング
  - [ ] 2.4 カテゴリ変更時に自動再フェッチ（`params`変更を監視）
  - [ ] 2.5 `videos`/`isLoading`/`error`/`fetchVideos`/`hasNextPage`/`loadMore`を返却
  - [ ] 2.6 ページネーション: `loadMore()`でカーソルベースの追加読み込み

- [ ] **Task 3: トップページのServiceContext統合** (AC: #1, #2)
  - [ ] 3.1 `src/app/page.tsx`を更新
  - [ ] 3.2 `useVideo()`を`useVideoList()`に置き換え
  - [ ] 3.3 既存のカテゴリフィルターUI（`CATEGORIES`配列、ボタン群）はそのまま維持
  - [ ] 3.4 カテゴリ選択時: `fetchVideos({ category: selectedCategory })`呼び出し
  - [ ] 3.5 "All"選択時: `fetchVideos({})`呼び出し（フィルタなし）
  - [ ] 3.6 エラー表示: `AppError.message`ベースに更新
  - [ ] 3.7 レスポンシブグリッド維持: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`

- [ ] **Task 4: VideoCardの公開/限定バッジ強化** (AC: #1)
  - [ ] 4.1 `src/components/video/VideoCard.tsx`を更新
  - [ ] 4.2 `accessType === 'public'`の場合: 「公開」バッジ表示（現在はアイコンなし→テキストバッジ追加）
  - [ ] 4.3 `accessType !== 'public'`の場合: 「限定」バッジ表示（既存のロックアイコン + テキスト追加）
  - [ ] 4.4 バッジ色: 公開=green、限定=amber（既存のamber色アイコンと統一）
  - [ ] 4.5 バッジ配置: カード左上に配置（右上はduration）

- [ ] **Task 5: チャンネルページ作成** (AC: #3)
  - [ ] 5.1 `src/app/channel/[address]/page.tsx`を更新（既存ファイル）
  - [ ] 5.2 `useVideoList({ creatorAddress: address })`でクリエイターの動画一覧取得
  - [ ] 5.3 クリエイター情報表示: アドレス（短縮 + フルコピー）
  - [ ] 5.4 動画グリッド: トップページと同じ`VideoCard`使用
  - [ ] 5.5 動画0件時のエンプティステート
  - [ ] 5.6 トップページへの戻りリンク

- [ ] **Task 6: VideoCardからチャンネルページへの導線** (AC: #3)
  - [ ] 6.1 `VideoCard`のクリエイターアドレスをクリッカブルに（`/channel/[address]`へのリンク）
  - [ ] 6.2 クリック時にイベント伝播を止める（カード全体のリンクと競合防止）

- [ ] **Task 7: IrysServiceImplテスト** (AC: #1, #2, #3)
  - [ ] 7.1 `src/lib/irys.test.ts`を更新
  - [ ] 7.2 queryFiles全件取得テスト: フィルタなしで`VideoListItem[]`が返る
  - [ ] 7.3 queryFilesカテゴリフィルタテスト: `Category`タグがGraphQLクエリに含まれる
  - [ ] 7.4 queryFilesクリエイターフィルタテスト: `Creator`タグがGraphQLクエリに含まれる
  - [ ] 7.5 queryFiles複合フィルタテスト: Category + Creator同時指定

- [ ] **Task 8: 最終検証** (AC: #1-3)
  - [ ] 8.1 `pnpm build` — ゼロエラー
  - [ ] 8.2 `pnpm test` — 全テストパス
  - [ ] 8.3 `pnpm lint` — 変更ファイルゼロ警告
  - [ ] 8.4 `pnpm dev`で手動動作確認:
    - トップページに動画一覧がカード形式で表示
    - カテゴリボタンで絞り込みが動作
    - 公開/限定バッジが各カードに表示
    - クリエイターアドレスクリックでチャンネルページに遷移
    - チャンネルページにそのクリエイターの動画のみ表示

## Dev Notes

### 実装順序（依存関係に基づく）

**必ずこの順序で実装すること：**
1. **Task 1 (IrysServiceImpl queryFiles)** — クエリ基盤。全タスクの前提
2. **Task 7 (テスト)** — Task 1完了後にテスト
3. **Task 2 (useVideoList)** — Task 1に依存
4. **Task 4 (VideoCardバッジ)** — 独立タスク（Task 2と並行可能）
5. **Task 3 (トップページ更新)** — Task 2 + Task 4に依存
6. **Task 6 (チャンネル導線)** — Task 4に依存
7. **Task 5 (チャンネルページ)** — Task 2 + Task 6に依存
8. **Task 8 (最終検証)** — 全タスク完了後

### Story 2.1-2.4への依存関係（前提条件）

**前提ストーリーで実装済みの基盤：**

| コンポーネント | ファイル | 状態 |
|--------------|--------|------|
| `IrysServiceImpl` | `src/lib/irys.ts` | Story 2.2でResult型化済み。`queryFiles`は本ストーリーで拡張 |
| `ServiceContext` | `src/contexts/ServiceContext.tsx` | IrysService注入済み |
| `VideoCard` | `src/components/video/VideoCard.tsx` | 既存。バッジ強化の対象 |
| `config.ts` | `src/lib/config.ts` | `IRYS_GRAPHQL_ENDPOINT`環境変数済み |
| 型定義 | `src/types/video.ts` | `VideoListItem`, `VideoQueryParams`, `VideoCategory`, `AccessType`定義済み |
| 型定義 | `src/types/services.ts` | `IrysService` Interface定義済み |

### Architecture Compliance（必須遵守ルール）

**命名規則:**
- 新規フック: `useVideoList.ts`（`use`プレフィックス + camelCase）
- テストファイル: `.test.ts`（コロケーション）
- Irysタグ: PascalCase（`AppName`, `Category`, `Creator`, `AccessType`）

**Result型パターン（IrysServiceImpl準拠）:**
```typescript
async queryFiles(
  recipientAddress: string,
  options?: { signal?: AbortSignal }
): Promise<Result<unknown[]>>
```

**注意:** `IrysService` Interface（`src/types/services.ts`）の`queryFiles`シグネチャは`recipientAddress: string`だが、本ストーリーではフィルタパラメータをGraphQLクエリに直接組み込む方式とする。`recipientAddress`をクリエイターアドレスとして使用し、追加のフィルタパラメータは内部でオーバーロード的に処理する。

**ローディング状態パターン:**
| 場面 | 状態変数名 | UI表現 |
|------|----------|--------|
| 動画一覧フェッチ | `isLoading` | Skeleton UI / スピナー |

**構造化ログフォーマット:**
```
[METRIC] event=irys_query, filter_category=X, filter_creator=Y, result_count=Z, duration_ms=W, timestamp=T
```

### Technical Requirements

#### Task 1: IrysServiceImpl queryFiles強化

**現行コード（`src/lib/irys.ts` 行231-296）の問題:**
- `Recipient`タグでフィルタ（旧パターン）→ `Creator` + `Type: "video-metadata"`に変更必要
- カテゴリ・アクセスタイプのフィルタ未対応
- GraphQLレスポンスから`VideoListItem`への変換なし（生edgesを返している）

**リファクタリング方針:**

```typescript
async queryFiles(
  recipientAddress: string, // Interface互換のためシグネチャ維持。空文字 = 全件
  options?: { signal?: AbortSignal }
): Promise<Result<unknown[]>> {
  // recipientAddressの使い方:
  // - 空文字: 全件取得（トップページ）
  // - アドレス: クリエイター絞り込み（チャンネルページ）

  const tags: { name: string; values: string[] }[] = [
    { name: "AppName", values: ["DecentralizedVideo"] },
    { name: "Type", values: ["video-metadata"] },
  ];

  if (recipientAddress) {
    tags.push({ name: "Creator", values: [recipientAddress] });
  }

  // 注: カテゴリフィルタはuseVideoList側でクライアントフィルタリング
  // Irys GraphQLは単一タグ=複数values のみサポート（複数タグはAND条件）

  const query = `
    query {
      transactions(
        tags: [${tags.map(t => `{ name: "${t.name}", values: ${JSON.stringify(t.values)} }`).join(', ')}]
        first: 20
        order: DESC
      ) {
        edges {
          node {
            id
            tags { name value }
            timestamp
          }
          cursor
        }
        pageInfo { hasNextPage }
      }
    }
  `;

  // ... fetch + Result型パターン
}
```

**カテゴリフィルタの実装方針:**

Irys GraphQLのタグフィルタは**AND条件**で動作するため、`Category`タグをGraphQLクエリに直接追加可能:

```graphql
tags: [
  { name: "AppName", values: ["DecentralizedVideo"] },
  { name: "Type", values: ["video-metadata"] },
  { name: "Category", values: ["gaming"] }
]
```

ただし、現行の`IrysService` Interfaceの`queryFiles`シグネチャが`recipientAddress: string`のみのため、カテゴリフィルタはGraphQLレベルとクライアントレベルの2段構えで実装する:

1. **GraphQLレベル:** `Creator`タグでフィルタ（チャンネルページ用）
2. **クライアントレベル:** `useVideoList`フック内でカテゴリ・アクセスタイプのクライアントフィルタ

**将来改善:** `IrysService` Interfaceの`queryFiles`引数を`VideoQueryParams`に拡張する（破壊的変更のため次回のInterfaceリファクタで対応）。

**GraphQLレスポンスからVideoListItemへの変換:**

```typescript
function parseGraphQLEdge(edge: { node: { id: string; tags: { name: string; value: string }[]; timestamp: number }; cursor: string }): VideoListItem {
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
    totalTips: BigInt(0), // 投げ銭集計はStory 3で実装
  };
}
```

#### Task 2: useVideoListフック

**`src/hooks/useVideoList.ts`:**

```typescript
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useServiceContext } from '@/contexts/ServiceContext';
import type { VideoListItem, VideoQueryParams, VideoCategory, AccessType } from '@/types/video';

interface UseVideoListReturn {
  videos: VideoListItem[];
  isLoading: boolean;
  error: string | null;
  fetchVideos: (params?: VideoQueryParams) => Promise<void>;
  hasNextPage: boolean;
  loadMore: () => Promise<void>;
}

export function useVideoList(initialParams?: VideoQueryParams): UseVideoListReturn {
  const { irys } = useServiceContext();
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  const fetchVideos = useCallback(async (params?: VideoQueryParams) => {
    setIsLoading(true);
    setError(null);

    const startTime = Date.now();
    const result = await irys.queryFiles(params?.creatorAddress || '', {});

    if (!result.success) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    // GraphQLレスポンスをVideoListItem[]に変換
    const items = (result.data as Array<{ node: { id: string; tags: { name: string; value: string }[]; timestamp: number } }>)
      .map(edge => parseGraphQLEdge(edge));

    // クライアントサイドフィルタ（カテゴリ、アクセスタイプ）
    let filtered = items;
    if (params?.category) {
      filtered = filtered.filter(v => v.category === params.category);
    }
    if (params?.accessType) {
      filtered = filtered.filter(v => v.accessType === params.accessType);
    }

    const durationMs = Date.now() - startTime;
    console.log(`[METRIC] event=irys_query, filter_category=${params?.category || 'all'}, filter_creator=${params?.creatorAddress || 'all'}, result_count=${filtered.length}, duration_ms=${durationMs}, timestamp=${new Date().toISOString()}`);

    setVideos(filtered);
    setIsLoading(false);
  }, [irys]);

  // 初回パラメータでの自動フェッチ
  useEffect(() => {
    fetchVideos(initialParams);
  }, [fetchVideos, initialParams]);

  const loadMore = useCallback(async () => {
    // ページネーション実装（P1で強化）
  }, []);

  return { videos, isLoading, error, fetchVideos, hasNextPage, loadMore };
}
```

**注意:** `useVideo`フックは既存のまま維持。`useVideoList`は新規作成。旧`useVideo().fetchVideos`はStory 2.5完了後に非推奨化。

#### Task 3: トップページ更新

**変更方針:**
- `import { useVideo } from '@/hooks/useVideo'` → `import { useVideoList } from '@/hooks/useVideoList'`
- `useVideo()`呼び出しを`useVideoList()`に置き換え
- 既存のカテゴリフィルターUI（`CATEGORIES`配列、ボタン群）はそのまま維持
- `fetchVideos`呼び出しをカテゴリ変更時のeffect内で更新

**既存UIの保持:**
- ヘッダー（ロゴ、Uploadボタン、Login）: 変更なし
- ヒーローセクション: 変更なし
- カテゴリフィルターボタン群: 変更なし（既に`CATEGORIES`配列で定義済み）
- 動画グリッド: `VideoCard`使用、変更なし
- フッター: 変更なし

#### Task 4: VideoCardバッジ強化

**現行コード（`src/components/video/VideoCard.tsx`）の状態:**
- `accessType === 'public'`の場合: バッジなし（`accessIcons.public = null`）
- `accessType !== 'public'`の場合: 右上にロックアイコンのみ

**変更方針:**
```typescript
// カード左上にテキストバッジ追加
{video.accessType === 'public' ? (
  <div className="absolute top-2 left-2 bg-green-500/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
    公開
  </div>
) : (
  <div className="absolute top-2 left-2 bg-amber-500/90 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
    </svg>
    限定
  </div>
)}
```

既存の右上アイコン（`accessIcons`）は冗長になるため削除し、左上テキストバッジに統一。

#### Task 5: チャンネルページ

**既存ファイル:** `src/app/channel/[address]/page.tsx`（既に存在）

**変更方針:**
- 既存実装を`useVideoList({ creatorAddress: address })`に更新
- レイアウト: ヘッダーにクリエイターアドレス + 動画グリッド

```typescript
"use client";

import { useParams } from 'next/navigation';
import { useVideoList } from '@/hooks/useVideoList';
import { VideoCard } from '@/components/video/VideoCard';
import Link from 'next/link';

export default function ChannelPage() {
  const params = useParams();
  const address = params.address as string;
  const { videos, isLoading, error } = useVideoList({ creatorAddress: address });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="...">
        <Link href="/">← トップページ</Link>
        <h1>{address.slice(0, 6)}...{address.slice(-4)} のチャンネル</h1>
      </header>

      {/* 動画グリッド */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map(video => <VideoCard key={video.id} video={video} />)}
        </div>
      </main>
    </div>
  );
}
```

#### Task 6: VideoCardチャンネルリンク

**クリエイターアドレスのリンク化:**

```typescript
// VideoCard内部
<span
  title={video.creatorAddress}
  onClick={(e) => {
    e.preventDefault(); // カード全体のLinkイベントを止める
    e.stopPropagation();
    window.location.href = `/channel/${video.creatorAddress}`;
  }}
  className="hover:text-blue-500 hover:underline cursor-pointer"
>
  {truncateAddress(video.creatorAddress)}
</span>
```

**注意:** `VideoCard`全体が`<Link>`でラップされているため、`e.preventDefault()` + `e.stopPropagation()`で親のリンクを無効化する必要がある。代替案として`<Link>`をネストするとNext.jsの警告が出るため、`window.location.href`での遷移を使用。

### Previous Story Intelligence（Story 2.1-2.4からの学び）

**Story 1.1で確立された基盤（変更禁止）:**
- `types/errors.ts`: Result<T>, AppError, ErrorCategory
- `types/services.ts`: IrysService Interface（queryFiles定義済み）
- `types/video.ts`: VideoListItem, VideoQueryParams, VideoCategory, AccessType
- `vitest.config.ts`: @/エイリアス同期済み

**Story 2.2で確立された基盤:**
- `lib/irys.ts`: IrysServiceImpl Result型化済み。`queryFiles`メソッドが本ストーリーの拡張対象
- IrysタグPascalCase統一: `AppName`, `Creator`, `Type`, `Category`, `AccessType`

**Story 2.3で確立された基盤:**
- `lib/config.ts`: `IRYS_GRAPHQL_ENDPOINT`環境変数追加済み
- `useServiceContext()`: IrysService取得パターン確立

**既存`page.tsx`（トップページ）の参考:**
- `CATEGORIES`配列（7カテゴリ + "All"）が既に定義済み
- カテゴリフィルターUIが既に実装済み（ボタン群 + selectedCategory state）
- `useVideo().fetchVideos`を`useVideoList().fetchVideos`に置き換えるだけで動作する設計
- レスポンシブグリッド: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` — 維持

**既存`VideoCard.tsx`の参考:**
- `accessIcons`オブジェクトで`token-gated`と`subscription`のアイコンは定義済み
- `public`は`null`（バッジなし）→ 本ストーリーで公開バッジを追加
- `categoryColors`マップでカテゴリ別の色分けは実装済み
- `truncateAddress`関数で短縮アドレス表示は実装済み

**既存`useVideo`フックの参考:**
- `fetchVideos(params?: VideoQueryParams)`のインターフェースを`useVideoList`で踏襲
- `videoService.queryVideos(params)`を`irys.queryFiles(address)`に置き換え
- `isLoading`/`queryError`/`videos`のstate管理パターンを踏襲

### Git Intelligence

**直近コミット分析:**
1. `d98eeb5` docs: add sprint planning artifacts and test scaffolding
2. `13440ad` feat: integrate Privy AA and MetaMask dual wallet authentication

Story 2.1-2.4のdev-agentが実装中/完了のため、これらの実装コミットが前提条件。

### Project Structure Notes

**更新ファイル（このストーリー）:**
```
src/
  lib/
    irys.ts                  ← 更新（queryFilesフィルタ強化 + VideoListItem変換）
    irys.test.ts             ← 更新（フィルタテスト追加）
  hooks/
    useVideoList.ts          ← 新規
  components/video/
    VideoCard.tsx             ← 更新（公開/限定バッジ追加、チャンネルリンク）
  app/
    page.tsx                 ← 更新（useVideoList統合）
    channel/[address]/
      page.tsx               ← 更新（useVideoList統合）
```

**変更禁止ファイル:**
- `src/types/errors.ts` — Story 1.1で定義済み
- `src/types/services.ts` — Story 1.1で定義済み（IrysService Interface）
- `src/types/video.ts` — 既存型は共存
- `src/types/pipeline.ts` — Story 1.1で定義済み
- `src/lib/pipeline-reducer.ts` — Story 2.1で実装済み
- `src/lib/config.ts` — 変更不要
- `vitest.config.ts` — Story 1.1で設定済み

**既存ファイルとの関係:**
- `src/hooks/useVideo.ts` — 既存のまま維持。Story 2.5完了後に`useVideoList`が完全代替。ただし本ストーリーでは`useVideo`を直接変更しない
- `src/lib/video.ts` — 既存の`videoService.queryVideos()`は本ストーリーで参照されなくなる（トップページのみ）。ファイル自体は変更しない

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5] — Acceptance Criteria原文
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 3: API & Communication Patterns] — Result型、サービス層抽象化
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — IrysタグPascalCase、構造化ログ、ローディング状態パターン
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — API境界（Irys GraphQLプロキシ）
- [Source: _bmad-output/planning-artifacts/prd.md#FR31] — 動画一覧閲覧
- [Source: _bmad-output/planning-artifacts/prd.md#FR32] — タグ・カテゴリフィルタリング
- [Source: _bmad-output/planning-artifacts/prd.md#FR33] — 公開/限定識別表示
- [Source: _bmad-output/planning-artifacts/prd.md#FR34] — クリエイター別絞り込み
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Foundation Experience] — 動画視聴がFoundation Experience
- [Source: _bmad-output/implementation-artifacts/2-2-transcode-irys-storage.md] — IrysタグPascalCase統一、Irysメタデータ保存構造
- [Source: _bmad-output/implementation-artifacts/2-3-irys-deposit-creator-video-list.md] — IrysServiceImpl GraphQLクエリ、useCreatorVideosパターン

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
