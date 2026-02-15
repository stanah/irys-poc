# Story 2.3: Irysデポジットとクリエイター動画一覧

Status: ready-for-dev

## Story

As a **クリエイター**,
I want **Irysストレージに資金をデポジットし、自分の動画一覧を確認する**,
so that **動画保存のための残高を管理し、公開状況を把握できる**.

## Acceptance Criteria (BDD)

### AC1: Irysデポジット実行

**Given** ログイン済みクリエイターがデポジットページにアクセスした状態
**When** デポジット額を入力して実行する
**Then** Irysストレージに資金がデポジットされる（FR16）
**And** 残高が更新表示される

### AC2: クリエイター動画一覧表示

**Given** ログイン済みクリエイターの状態
**When** マイ動画一覧ページにアクセスする
**Then** Irys GraphQL経由で自分がアップロードした動画一覧が表示される（FR15）
**And** 各動画のタイトル、アクセスタイプ（公開/限定）、アップロード日時が表示される

### AC3: Irys GraphQLエンドポイント環境変数化

**Given** Irys GraphQLエンドポイントが環境変数で設定されている状態
**When** クエリを実行する
**Then** 環境変数`IRYS_GRAPHQL_ENDPOINT`の値が使用される（NFR-I4）

## Tasks / Subtasks

- [ ] **Task 1: IrysServiceImpl GraphQLクエリ強化** (AC: #2, #3)
  - [ ] 1.1 `src/lib/irys.ts`の`queryFiles`メソッドをIrys GraphQL API向けに書き換え
  - [ ] 1.2 クエリパラメータ: `AppName: "DecentralizedVideo"` + `Creator: {address}` + `Type: "video-metadata"`のタグフィルタ
  - [ ] 1.3 GraphQLエンドポイントを`getEnv().irysGraphqlEndpoint`から取得（NFR-I4）
  - [ ] 1.4 タイムアウト15秒適用（NFR-I3）
  - [ ] 1.5 レスポンスを`VideoListItem[]`型にパース（`getMetadata`で個別取得ではなく、GraphQLのtags情報からインライン構築）
  - [ ] 1.6 ページネーション対応: `first`/`after`パラメータ（初回は20件）
  - [ ] 1.7 Result型準拠（既存パターン踏襲）

- [ ] **Task 2: IrysServiceImpl deposit/getBalance強化** (AC: #1)
  - [ ] 2.1 `deposit`メソッドをResult型パターンに変換（Story 2.2のIrysServiceImplリファクタで基盤済み）
  - [ ] 2.2 デポジット金額バリデーション: 正の数値であること（Zod不要、単純な数値チェック）
  - [ ] 2.3 デポジット後に自動で残高取得→最新残高を返却
  - [ ] 2.4 `[METRIC]`構造化ログ: `event=irys_deposit, amount_eth=X, duration_ms=Y`
  - [ ] 2.5 `getBalance`のResult型パターン確認（Story 2.2で実装済みの場合はそのまま利用）

- [ ] **Task 3: 環境変数追加（IRYS_GRAPHQL_ENDPOINT）** (AC: #3)
  - [ ] 3.1 `src/lib/config.ts`の`clientEnvSchema`に`NEXT_PUBLIC_IRYS_GRAPHQL_ENDPOINT`追加（デフォルト: `https://uploader.irys.xyz/graphql`）
  - [ ] 3.2 `getEnv()`に`irysGraphqlEndpoint`フィールド追加
  - [ ] 3.3 `src/lib/config.test.ts`にデフォルト値テスト追加
  - [ ] 3.4 `.env.example`に`NEXT_PUBLIC_IRYS_GRAPHQL_ENDPOINT`追記

- [ ] **Task 4: useCreatorVideosフック作成** (AC: #2)
  - [ ] 4.1 `src/hooks/useCreatorVideos.ts`を新規作成
  - [ ] 4.2 `useServiceContext()`経由でIrysServiceを取得
  - [ ] 4.3 `useWalletContext()`から`address`取得
  - [ ] 4.4 `fetchMyVideos()`: `irys.queryFiles(address)`を呼び出しResult型ハンドリング
  - [ ] 4.5 ローディング状態(`isLoading`)、エラー状態(`error`)、動画一覧(`videos`)を返却
  - [ ] 4.6 マウント時に自動フェッチ（`address`変更時に再フェッチ）

- [ ] **Task 5: useIrysBalanceフック作成** (AC: #1)
  - [ ] 5.1 `src/hooks/useIrysBalance.ts`を新規作成
  - [ ] 5.2 `useServiceContext()`経由でIrysServiceを取得
  - [ ] 5.3 `getBalance()`: 残高取得（Result型ハンドリング）
  - [ ] 5.4 `deposit(amount)`: デポジット実行 → 完了後に自動で残高リフレッシュ
  - [ ] 5.5 `balance`/`isLoading`/`isPending`（デポジット中）/`error`を返却
  - [ ] 5.6 `isPending`はデポジットボタン内スピナー表示に使用（アーキテクチャ: ボタン操作中は`isPending`）

- [ ] **Task 6: マイ動画一覧ページ作成** (AC: #2)
  - [ ] 6.1 `src/app/(auth)/my-videos/page.tsx`を新規作成
  - [ ] 6.2 `useCreatorVideos`フック使用
  - [ ] 6.3 動画カード表示: タイトル、アクセスタイプバッジ（公開/限定）、アップロード日時、サムネイル
  - [ ] 6.4 既存の`VideoCard`コンポーネントを再利用（`src/components/video/VideoCard.tsx`）
  - [ ] 6.5 動画0件時のエンプティステート: 「まだ動画がありません」+「アップロード」リンク
  - [ ] 6.6 エラー表示: `AppError.message`表示 + リトライボタン
  - [ ] 6.7 ヘッダーに「マイ動画」タイトル + Irys残高表示エリア

- [ ] **Task 7: デポジットUI作成** (AC: #1)
  - [ ] 7.1 `src/components/irys/DepositForm.tsx`を新規作成
  - [ ] 7.2 デポジット額入力フィールド（ETH単位）
  - [ ] 7.3 プリセットボタン: 0.001 ETH、0.005 ETH、0.01 ETH
  - [ ] 7.4 現在の残高表示（`useIrysBalance`フック使用）
  - [ ] 7.5 「デポジット」ボタン: `isPending`中はスピナー + disabled
  - [ ] 7.6 成功時: 「デポジットが完了しました」メッセージ + 更新後残高表示
  - [ ] 7.7 失敗時: `AppError.message`表示
  - [ ] 7.8 マイ動画ページのサイドバーまたはヘッダー内に配置（インラインUI）

- [ ] **Task 8: ナビゲーション更新** (AC: #1, #2)
  - [ ] 8.1 ヘッダーにログイン済み時「マイ動画」リンク追加（`/my-videos`）
  - [ ] 8.2 アップロード完了後（Story 2.2）に「マイ動画」リンク提示（既存の完了UIにリンク追加）
  - [ ] 8.3 Story 2.2の残高不足エラーからデポジットUIへの導線確認

- [ ] **Task 9: IrysServiceImplテスト** (AC: #1, #2, #3)
  - [ ] 9.1 `src/lib/irys.test.ts`を更新
  - [ ] 9.2 queryFiles成功テスト: `Result<VideoListItem[]>`が返る（環境変数エンドポイント使用）
  - [ ] 9.3 queryFilesタグフィルタテスト: `AppName` + `Creator` + `Type`の3タグが正しくクエリに含まれる
  - [ ] 9.4 deposit成功テスト: `Result<void>`が返る
  - [ ] 9.5 deposit金額バリデーションテスト: 0以下の値でエラー

- [ ] **Task 10: 最終検証** (AC: #1-3)
  - [ ] 10.1 `pnpm build` — ゼロエラー
  - [ ] 10.2 `pnpm test` — 全テストパス
  - [ ] 10.3 `pnpm lint` — 変更ファイルゼロ警告
  - [ ] 10.4 `pnpm dev`で手動動作確認: マイ動画一覧表示→デポジット実行→残高更新

## Dev Notes

### 実装順序（依存関係に基づく）

**必ずこの順序で実装すること：**
1. **Task 3 (環境変数)** — GraphQLエンドポイント設定。Task 1の前提
2. **Task 1 (IrysServiceImpl GraphQL)** — クエリ基盤。Task 4の前提
3. **Task 2 (deposit/getBalance)** — デポジット基盤。Task 5の前提
4. **Task 9 (テスト)** — Task 1, 2完了後にテスト
5. **Task 4 (useCreatorVideos)** — Task 1に依存
6. **Task 5 (useIrysBalance)** — Task 2に依存
7. **Task 6 (マイ動画ページ)** — Task 4に依存
8. **Task 7 (デポジットUI)** — Task 5に依存
9. **Task 8 (ナビゲーション)** — Task 6, 7に依存
10. **Task 10 (最終検証)** — 全タスク完了後

### Story 2.1/2.2への依存関係（前提条件）

**Story 2.1/2.2で実装済みの基盤（このストーリーが前提とするもの）:**

| コンポーネント | ファイル | 状態 |
|--------------|--------|------|
| `IrysServiceImpl` | `src/lib/irys.ts` | Story 2.2でResult型化済み |
| `ServiceContext` | `src/contexts/ServiceContext.tsx` | IrysService注入済み |
| `VideoCard` | `src/components/video/VideoCard.tsx` | 既存。再利用可能 |
| `config.ts` | `src/lib/config.ts` | Zodスキーマバリデーション済み |
| 型定義 | `src/types/services.ts` | IrysService Interface定義済み（`queryFiles`, `deposit`, `getBalance`） |
| 型定義 | `src/types/video.ts` | VideoListItem型定義済み |

### Architecture Compliance（必須遵守ルール）

**命名規則:**
- 新規フック: `useCreatorVideos.ts`, `useIrysBalance.ts`（`use`プレフィックス + camelCase）
- 新規コンポーネント: `DepositForm.tsx`（PascalCase）
- 新規ページ: `src/app/(auth)/my-videos/page.tsx`（Next.js App Router規約）
- テストファイル: `.test.ts`（コロケーション）

**Result型パターン（全サービス層共通）:**
```typescript
type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E }
```

**IrysService Interface（`src/types/services.ts`定義済み — 変更禁止）:**
```typescript
interface IrysService {
  uploadData(data, tags, options?): Promise<Result<{ id: string }>>;
  getBalance(options?): Promise<Result<{ balance: string; formatted: string }>>;
  deposit(amount, options?): Promise<Result<void>>;
  queryFiles(recipientAddress, options?): Promise<Result<unknown[]>>;
  getMetadata(transactionId, options?): Promise<Result<unknown>>;
}
```

**注意:** `queryFiles`の引数名は`recipientAddress`だが、本ストーリーではクリエイターアドレスとして使用する。Irys GraphQLクエリでは`Creator`タグでフィルタリングする。

**ローディング状態パターン:**
| 場面 | 状態変数名 | UI表現 |
|------|----------|--------|
| 動画一覧フェッチ | `isLoading` | Skeleton UI |
| デポジット処理中 | `isPending` | ボタン内スピナー + disabled |

**構造化ログフォーマット:**
```
[METRIC] event=irys_deposit, amount_eth=X, duration_ms=Y, timestamp=Z
[METRIC] event=irys_query, creator=X, result_count=Y, duration_ms=Z, timestamp=W
```

### Technical Requirements

#### Task 1: IrysServiceImpl GraphQLクエリ

**Irys GraphQL API — クリエイター動画クエリ:**

```graphql
query {
  transactions(
    tags: [
      { name: "AppName", values: ["DecentralizedVideo"] },
      { name: "Creator", values: ["${creatorAddress}"] },
      { name: "Type", values: ["video-metadata"] }
    ]
    first: 20
    after: "${cursor}"
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
```

**レスポンスからVideoListItemへの変換:**
```typescript
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
    totalTips: BigInt(0), // 投げ銭集計はStory 3で実装
  };
}
```

**エンドポイント取得:**
```typescript
// IrysServiceImpl内部
private getGraphqlEndpoint(): string {
  return getEnv().irysGraphqlEndpoint;
}
```

**AppErrorコード一覧（追加分）:**

| code | message | retryable | 発生箇所 |
|------|---------|-----------|---------|
| `QUERY_FAILED` | 動画一覧の取得に失敗しました | true | queryFiles |
| `DEPOSIT_FAILED` | デポジットに失敗しました | true | deposit |
| `INVALID_AMOUNT` | 無効なデポジット額です | false | deposit |

#### Task 3: 環境変数追加

**`src/lib/config.ts`への追加:**
```typescript
const clientEnvSchema = z.object({
  // ... 既存フィールド
  NEXT_PUBLIC_IRYS_GRAPHQL_ENDPOINT: z.string().url().default('https://uploader.irys.xyz/graphql'),
});

export const getEnv = () => {
  return {
    // ... 既存フィールド
    irysGraphqlEndpoint: env.NEXT_PUBLIC_IRYS_GRAPHQL_ENDPOINT,
  };
};
```

#### Task 6: マイ動画一覧ページ

**ページ構成:**
```
┌─────────────────────────────────────────┐
│ ヘッダー（既存パターン踏襲）               │
├─────────────────────────────────────────┤
│ マイ動画 (h1)          [Irys残高: X ETH] │
│                        [デポジット ▼]    │
├─────────────────────────────────────────┤
│ デポジットフォーム（展開時）               │
│ ┌─────────────────────────────────────┐ │
│ │ 額: [____] ETH  [0.001][0.005][0.01]│ │
│ │               [デポジットする]        │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │動画1│ │動画2│ │動画3│ │動画4│          │
│ │    │ │    │ │    │ │    │          │
│ └────┘ └────┘ └────┘ └────┘          │
└─────────────────────────────────────────┘
```

**`(auth)` route groupの使用:**
マイ動画ページはログイン必須のため、既存の`(auth)`グループ内に配置。`(auth)/my-videos/page.tsx`。

#### Task 7: DepositFormコンポーネント

**`src/components/irys/DepositForm.tsx`:**
```typescript
"use client";

import { useState } from 'react';
import { useIrysBalance } from '@/hooks/useIrysBalance';

const PRESETS = [
  { label: '0.001 ETH', value: '0.001' },
  { label: '0.005 ETH', value: '0.005' },
  { label: '0.01 ETH', value: '0.01' },
];

export function DepositForm() {
  const { balance, isPending, error, deposit, isLoading } = useIrysBalance();
  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDeposit = async () => {
    setSuccess(false);
    const result = await deposit(amount);
    if (result) {
      setSuccess(true);
      setAmount('');
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Irys ストレージ残高</h3>
        <span className="text-lg font-mono">
          {isLoading ? '...' : `${balance?.formatted ?? '0'} ETH`}
        </span>
      </div>

      {/* プリセットボタン */}
      <div className="flex gap-2">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => setAmount(p.value)}
            className="px-3 py-1 text-sm border rounded-full hover:bg-gray-100"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 入力 + ボタン */}
      <div className="flex gap-2">
        <input
          type="number"
          step="0.001"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="デポジット額 (ETH)"
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          onClick={handleDeposit}
          disabled={isPending || !amount || Number(amount) <= 0}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
        >
          {isPending ? '処理中...' : 'デポジット'}
        </button>
      </div>

      {success && <p className="text-green-600 text-sm">デポジットが完了しました</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
```

### Previous Story Intelligence（Story 2.1/2.2からの学び）

**Story 1.1で確立された基盤（変更禁止）:**
- `types/errors.ts`: Result<T>, AppError, ErrorCategory
- `types/services.ts`: IrysService Interface（queryFiles, deposit, getBalance定義済み）
- `types/video.ts`: VideoListItem, VideoQueryParams型
- `lib/compose-providers.tsx`: composeProviders
- `vitest.config.ts`: @/エイリアス同期済み

**Story 2.1で確立された基盤:**
- `contexts/ServiceContext.tsx`: ServiceProvider（IrysService注入済み）
- `useServiceContext()`: DI取得パターン確立

**Story 2.2で確立された基盤:**
- `lib/irys.ts`: IrysServiceImplのResult型化（このストーリーで拡張）
- `lib/config.ts`: Zodスキーマバリデーション（このストーリーでIRYS_GRAPHQL_ENDPOINT追加）
- IrysタグPascalCase統一: `AppName`, `Creator`, `Type`, `AccessType`等

**既存`irys.ts`の`queryFiles`について:**
- 現行は`App-Name: "SecureFileSharePoC"` + `Recipient`でフィルタ（旧アーキテクチャ）
- このストーリーで`AppName: "DecentralizedVideo"` + `Creator` + `Type: "video-metadata"`に書き換え
- GraphQLエンドポイントをハードコードから環境変数に変更

**既存`page.tsx`（トップページ）の`useVideo`フック:**
- `useVideo`は`videoService.queryVideos()`を使用（旧パターン）
- このストーリーの`useCreatorVideos`は`ServiceContext`経由の新パターン
- 将来的にStory 2.5で`useVideo`も新パターンに移行

### Git Intelligence

**直近コミット分析はStory 2.2と同一。**

Story 2.1/2.2のdev-agentが実装中のため、これらの実装コミットが前提条件。

### Project Structure Notes

**新規ファイル（このストーリーで作成）:**
```
src/
  hooks/
    useCreatorVideos.ts      ← 新規
    useIrysBalance.ts        ← 新規
  components/
    irys/
      DepositForm.tsx        ← 新規
  app/
    (auth)/
      my-videos/
        page.tsx             ← 新規
  lib/
    irys.ts                  ← 更新（queryFiles書き換え、deposit強化）
    irys.test.ts             ← 更新（クエリ/デポジットテスト追加）
    config.ts                ← 更新（IRYS_GRAPHQL_ENDPOINT追加）
    config.test.ts           ← 更新（新環境変数テスト追加）
.env.example                 ← 更新（IRYS_GRAPHQL_ENDPOINT追記）
```

**変更禁止ファイル:**
- `src/types/errors.ts` — Story 1.1で定義済み
- `src/types/services.ts` — Story 1.1で定義済み（IrysService Interface）
- `src/types/video.ts` — 既存型は共存
- `src/types/pipeline.ts` — Story 1.1で定義済み
- `src/lib/pipeline-reducer.ts` — Story 2.1で実装済み
- `vitest.config.ts` — Story 1.1で設定済み

**既存ファイルとの関係:**
- `src/hooks/useVideo.ts` — 既存のまま維持。トップページ・視聴ページで使用中
- `src/components/video/VideoCard.tsx` — 既存。マイ動画一覧で再利用
- `src/app/page.tsx` — 変更しない（トップページ）。ヘッダーにマイ動画リンクを追加する場合はLayoutレベルの変更を検討

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3] — Acceptance Criteria原文
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 3: API & Communication Patterns] — Result型、サービス層抽象化
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 5: Infrastructure & Deployment] — 環境変数Zodスキーマ、構造化ログ
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — 命名規則、IrysタグPascalCase、ローディング状態パターン
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — API境界（Irys GraphQLプロキシ）
- [Source: _bmad-output/planning-artifacts/prd.md#FR15] — クリエイター動画一覧
- [Source: _bmad-output/planning-artifacts/prd.md#FR16] — Irysストレージ資金デポジット
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-I3] — プロトコル別タイムアウト（Irys: 15秒）
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-I4] — Irys GraphQLエンドポイント環境変数化
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Effortless Interactions] — クリエイター体験設計
- [Source: _bmad-output/implementation-artifacts/2-1-video-upload-form-livepeer-tus.md] — ServiceContext、useServiceContextパターン
- [Source: _bmad-output/implementation-artifacts/2-2-transcode-irys-storage.md] — IrysServiceImplリファクタ、IrysタグPascalCase統一

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
