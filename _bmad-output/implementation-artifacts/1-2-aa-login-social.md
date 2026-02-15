# Story 1.2: AAログインでファンがソーシャルログインできる

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **ファン（Web3初心者）**,
I want **GoogleアカウントやPasskeyでログインする**,
So that **MetaMaskなしで3ステップ以内にプラットフォームを利用開始できる**.

## Acceptance Criteria (BDD)

### AC1: Googleアカウントでのソーシャルログイン

**Given** 未ログインのユーザーがトップページにアクセスした状態
**When** ログインボタンを押してGoogleアカウントで認証する
**Then** 3ステップ以内（ログイン→プロフィール確認→利用開始）でオンボーディングが完了する
**And** AA（permissionless.js + Pimlico）経由でスマートアカウントが作成される

### AC2: Passkeyでのログイン

**Given** Privy SDKが統合された状態
**When** Passkeyでログインを試みる
**Then** WebAuthnフローが完了し、スマートアカウントが利用可能になる

### AC3: AAログイン失敗時のMetaMaskフォールバック

**Given** AAログイン中にPrivy側でエラーが発生した状態
**When** アカウント作成に失敗する
**Then** 「アカウント作成に失敗しました」エラーメッセージが表示される
**And** 「MetaMaskでログイン」への代替手段リンクが提示される（FR5）

### AC4: 統一WalletインターフェースでのDI統合

**Given** ServiceContext（DI）が設定された状態
**When** WalletContextがAAウォレットを初期化する
**Then** 統一Walletインターフェース経由でウォレットアドレスが取得できる
**And** ウォレット秘密鍵がサーバー側に送信されない（NFR-S1）

## Tasks / Subtasks

- [x] **Task 1: 依存パッケージのインストールと環境変数設定** (AC: #1, #2, #4)
  - [x] 1.1 `@privy-io/react-auth`（v3.x）をインストール
  - [x] 1.2 `permissionless`（v0.3.x）をインストール
  - [x] 1.3 `@account-kit/react`と`@account-kit/infra`をアンインストール（未使用のため）
  - [x] 1.4 `src/lib/config.ts`の`clientEnvSchema`に`NEXT_PUBLIC_PRIVY_APP_ID`（z.string().min(1)）を追加
  - [x] 1.5 `src/lib/config.ts`の`clientEnvSchema`に`NEXT_PUBLIC_PIMLICO_API_KEY`（z.string().optional()）を追加
  - [x] 1.6 `.env.example`にPrivy/Pimlico環境変数を追加
  - [x] 1.7 `src/lib/config.test.ts`にPrivy環境変数バリデーションテストを追加（5テスト）
  - [x] 1.8 `pnpm build`でビルドエラーなしを確認

- [x] **Task 2: PrivyProvider統合とProvider構成更新** (AC: #1, #2, #4)
  - [x] 2.1 `src/contexts/PrivyConfig.tsx`を作成: PrivyProviderのラッパー（`'use client'`）
  - [x] 2.2 PrivyProvider設定: `appId`, `loginMethods: ['google', 'passkey']`, `appearance`, `embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } }`
  - [x] 2.3 `src/app/providers.tsx`のcomposeProviders配列にPrivyProviderを追加（WalletProviderの前に配置）
  - [x] 2.4 `pnpm build`で動作確認

- [x] **Task 3: 統一Walletインターフェースの実装** (AC: #4)
  - [x] 3.1 `src/types/wallet.ts`を作成: `UnifiedWallet`型定義（`address`, `walletClient`, `connectionType: 'aa' | 'metamask'`, `smartAccountAddress?`）
  - [x] 3.2 `src/hooks/useWallet.ts`をリファクタ: Privy embedded wallet → permissionless.js SmartAccountを統合
  - [x] 3.3 AA接続時: Privy EOAをsignerとし、SimpleSmartAccount（permissionless.js）を作成
  - [x] 3.4 MetaMask接続時: 既存の`window.ethereum`フローを維持（互換性保持）
  - [x] 3.5 `WalletContext`が返す型を`UnifiedWallet`に統一（コンポーネント層は認証方式を意識しない）
  - [x] 3.6 `pnpm build`でビルドエラーなしを確認

- [x] **Task 4: Login.tsxのUI更新** (AC: #1, #2, #3)
  - [x] 4.1 `src/components/Login.tsx`を更新: Privyログインボタンを追加（login()でモーダル表示、Google/Passkey選択可能）
  - [x] 4.2 Passkey対応（Privyモーダル経由）
  - [x] 4.3 既存の「MetaMaskで接続」ボタンを維持
  - [x] 4.4 AAログインエラー時に「MetaMaskでログイン」フォールバックリンクを表示（FR5）
  - [x] 4.5 ログイン状態表示を統一: 接続方式（AA/MetaMask）の識別表示を追加

- [x] **Task 5: alchemy.tsの整理** (AC: #4)
  - [x] 5.1 `src/lib/alchemy.ts`を削除（Account Kit未使用、Privy + permissionless.jsに置換済み）
  - [x] 5.2 `alchemy.ts`を参照している箇所がないことをGrepで確認

- [x] **Task 6: テスト作成** (AC: #1-4)
  - [x] 6.1 `src/hooks/useWallet.test.ts`を作成: AA接続・MetaMask接続・切断・エラーハンドリングのテスト（8テスト）
  - [x] 6.2 `src/lib/config.test.ts`に追加: Privy/Pimlico環境変数テスト（5テスト）
  - [x] 6.3 `pnpm test`で全テストパス確認（66テスト全パス）

- [x] **Task 7: 最終検証** (AC: #1-4)
  - [x] 7.1 `pnpm build` — ゼロエラー
  - [x] 7.2 `pnpm test` — 全66テストパス
  - [x] 7.3 `pnpm lint` — ゼロ警告（変更ファイル対象）
  - [ ] 7.4 `pnpm dev`でGoogleログイン→プロフィール表示→利用開始の3ステップフロー確認（手動）

## Dev Notes

### 実装順序（依存関係に基づく）

**必ずこの順序で実装すること：**
1. **Task 1 (依存関係)** — パッケージインストールとenv設定が全タスクの前提
2. **Task 2 (PrivyProvider)** — Privy統合がAA認証の前提
3. **Task 5 (alchemy.ts削除)** — 未使用コードの削除（Task 2後、Task 3前に実施で整理）
4. **Task 3 (統一Wallet)** — useWalletリファクタ。Privy + permissionless.jsの中核実装
5. **Task 4 (Login UI)** — Task 3の統一Walletインターフェースを使用
6. **Task 6 (テスト)** — 実装完了後にテスト作成
7. **Task 7 (最終検証)** — 全タスク完了後

### Architecture Compliance（必須遵守ルール）

**命名規則（Story 1.1で確立済み — 厳守）:**
- Interface: プレフィックスなしPascalCase（`UnifiedWallet`）。`IWallet`禁止
- 型定義ファイル: camelCase（`wallet.ts`）
- フック: `use`プレフィックス + camelCase（`useWallet.ts`）
- テストファイル: Unit = `.test.ts`（コロケーション）

**Result型パターン（サービス層のみ — フック層は適用不要）:**
- `useWallet`はフック層のため`Result<T>`を返す義務はない
- ただしPrivy/permissionless.jsのエラーはcatchして`state.error`に格納

**Provider合成:**
- `composeProviders()`を使用。配列順序 = ネスティング順序
- PrivyProviderはWalletProviderの外側（PrivyがWalletの前提）

**セキュリティ（NFR-S1厳守）:**
- ウォレット秘密鍵はサーバーサイドに送信・保存しない
- Privy embedded walletの秘密鍵はクライアントサイドのiframe内で管理される
- `PIMLICO_API_KEY`はサーバー専用変数（`NEXT_PUBLIC_`プレフィックスなし）— ただしPoC段階ではクライアントサイドでbundler/paymaster呼び出しが必要なため、`NEXT_PUBLIC_PIMLICO_API_KEY`として公開する設計も検討すること。Pimlico API keyはレート制限付きで公開前提のためセキュリティリスクは限定的

### Technical Requirements

#### Task 1: 依存パッケージ

**インストール:**
```bash
pnpm add @privy-io/react-auth permissionless
pnpm remove @account-kit/react @account-kit/infra
```

**`config.ts`追加スキーマ:**
```typescript
// clientEnvSchemaに追加
NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1, "Privy App ID is required"),
NEXT_PUBLIC_PIMLICO_API_KEY: z.string().optional(),
```

**`.env.example`追加:**
```
# AA Authentication (Privy + Pimlico)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key
```

**注意:**
- `@account-kit/react`と`@account-kit/infra`は`alchemy.ts`で使用されているが、`alchemy.ts`は実際にはアプリから呼び出されていない（providers.tsxに未統合）。削除対象
- `ethers`パッケージも現在使用箇所なし。ただし他ライブラリの間接依存の可能性があるため、このストーリーでは触らない

#### Task 2: PrivyProvider構成

**`src/contexts/PrivyConfig.tsx`（新規作成）:**

PrivyProviderをcomposeProvidersで使うためのラッパーコンポーネント。PrivyProviderはchildrenを受け取るが、`appId`等のprops設定が必要なため、ラッパーでpropsをバインドする。

```typescript
"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { type PropsWithChildren } from "react";
import { env } from "@/lib/config";

export function PrivyProviderWrapper({ children }: PropsWithChildren) {
  return (
    <PrivyProvider
      appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "passkey"],
        appearance: {
          theme: "light",
          accentColor: "#f97316", // 既存のオレンジ系カラーと統一
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

**`src/app/providers.tsx`更新:**
```typescript
const ComposedProviders = composeProviders([
  PrivyProviderWrapper, // Privyが最外側（他ProviderがPrivy contextに依存）
  WalletProvider,
]);
```

#### Task 3: 統一Walletインターフェース

**設計方針:**
- `useWallet`が2つの認証パス（AA/MetaMask）を吸収
- コンポーネント層は`connectionType`を意識しなくてよい
- `address`は常にEOAまたはSmartAccountアドレスを返す

**`src/types/wallet.ts`（新規作成）:**
```typescript
import type { WalletClient } from "viem";

export type ConnectionType = "aa" | "metamask" | null;

export type UnifiedWallet = {
  address: `0x${string}` | null;
  walletClient: WalletClient | null;
  connectionType: ConnectionType;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  // AA-specific
  smartAccountAddress: `0x${string}` | null;
  // Actions
  connectWithAA: () => Promise<void>;
  connectWithMetaMask: () => Promise<void>;
  disconnect: () => void;
};
```

**permissionless.js SmartAccount作成パターン:**
```typescript
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { http, createPublicClient } from "viem";
import { polygonAmoy } from "viem/chains";

// Privy embedded wallet → EOA signer取得
// toSimpleSmartAccount でSmartAccount作成
// createSmartAccountClient でクライアント作成（Pimlico bundler/paymaster統合）
```

**既存コードとの互換性:**
- `src/lib/irys.ts`の`getWebIrys()`は`window.ethereum`を直接使用 → MetaMask接続時はそのまま動作。AA接続時は後続ストーリーで対応
- `src/lib/lit.ts`の`getAuthSig()`は`WalletClient.signMessage()`を使用 → AA接続時はPrivy embedded walletのsignerで署名可能。ただしSmart Account addressでSIWEメッセージを構成する必要あり → 後続ストーリー（1.3以降）で対応

**CRITICAL:** このストーリーのスコープはAA認証フローの確立まで。irys.ts/lit.tsとの完全統合は後続ストーリーで実施。AA接続時にウォレットアドレスが取得でき、プロフィール画面に表示できることがゴール。

#### Task 4: Login.tsx UI設計

**ログインUIの構成:**
```
┌─────────────────────────────┐
│   🌐 Googleでログイン        │  ← Privy login (primary CTA)
├─────────────────────────────┤
│   🔑 Passkeyでログイン       │  ← Privy passkey
├─────────────────────────────┤
│   ────── または ──────       │
├─────────────────────────────┤
│   🦊 MetaMaskで接続          │  ← 既存フロー維持
└─────────────────────────────┘
```

**エラー時フォールバック（FR5）:**
```
AAログイン失敗時:
「アカウント作成に失敗しました。MetaMaskでログインを試みてください。」
[MetaMaskでログイン] ← ボタンリンク
```

**接続後の表示:**
```
Connected (AA) / Connected (MetaMask)
0x1234...abcd  📋 Copy
[Disconnect]
```

### Previous Story Intelligence（Story 1.1からの学習）

**Story 1.1で確立されたパターン — 厳守:**
1. **Zodスキーマ変更時はテスト必須** — `config.test.ts`に新しい環境変数のテスト追加忘れずに
2. **`pnpm build`は各タスク完了ごとに実行** — 型エラーの早期検出
3. **Provider合成は`composeProviders()`** — 手動ネスティング禁止
4. **ethAddressSchema**を使用 — 0x hex検証付きEthereumアドレスバリデーション（config.tsに定義済み）

**Story 1.1のコードレビューで修正された問題を繰り返さないこと:**
- H1: `.gitignore`の設定は変更不要（`.env.example`は追跡済み）
- H2: Ethereumアドレスのバリデーションは`ethAddressSchema`を使用
- H3: services.tsの型は具体的に。`unknown`を安易に使わない
- H4: 環境変数は`env.`経由でアクセス。`process.env`直接参照禁止
- M2: `.gitignore`にPlaywright関連は追加済み

**Story 1.1で作成されたファイル一覧（変更時は注意）:**
- `vitest.config.ts` — 変更不要
- `playwright.config.ts` — 変更不要
- `src/lib/config.ts` — Task 1で更新（env追加）
- `src/lib/config.test.ts` — Task 1で更新（テスト追加）
- `src/lib/compose-providers.tsx` — 変更不要
- `src/types/errors.ts` — 変更不要
- `src/types/services.ts` — このストーリーでは変更不要。`walletClient: unknown`コメントはStory 1.3で対応
- `src/types/pipeline.ts` — 変更不要
- `src/app/providers.tsx` — Task 2で更新（PrivyProvider追加）

### Git Intelligence

**直近のコミット（ドキュメント系のみ — コード変更はまだメインブランチに未反映）:**
- 166826a: architecture decision document
- 6b3b584: PRD完成
- Story 1.1の実装は`done`だがメインブランチへのマージはgit logに表示されていない（working tree上の変更として存在）

**未コミットの変更（git status）:**
- `.gitignore`, `package.json`, `pnpm-lock.yaml`, `providers.tsx`, `config.ts`が変更済み
- 新規ファイル: `compose-providers.tsx`, `config.test.ts`, `vitest.config.ts`, `playwright.config.ts`, 型定義ファイル群, テストファイル群

### Latest Technical Information

**@privy-io/react-auth v3.13.1:**
- Next.js App Router対応（`'use client'`必須）
- `loginMethods`で認証方式を制御: `['google', 'passkey']`
- `embeddedWallets.createOnLogin`で自動EOA作成
- React 19互換性: Next.js 16 App Router環境での動作報告あり

**permissionless v0.3.2:**
- viem 2.18.0以降のネイティブAA primitiveを使用
- `toSimpleSmartAccount` / `toSafeSmartAccount` でスマートアカウント作成
- PoC段階では`toSimpleSmartAccount`で十分（軽量）

**Pimlico Polygon Amoy:**
- Bundler endpoint: `https://api.pimlico.io/v1/polygon-amoy/rpc?apikey={key}`
- Paymaster endpoint: `https://api.pimlico.io/v2/polygon-amoy/rpc?apikey={key}`
- ERC-20 Paymaster対応（USDC on Amoy）

**CRITICAL — Privy + permissionless.js統合の注意点:**
- Privy embedded wallet = EOA（signerとして使用）
- SmartAccount = permissionless.jsが作成（資産保持・トランザクション送信の主体）
- Privy EOAは直接トランザクションを送らない。SmartAccountのsignerとしてのみ機能

### Library/Framework Requirements

| パッケージ | バージョン | 用途 | 注意事項 |
|-----------|-----------|------|---------|
| @privy-io/react-auth | ^3.13 | AA認証（Google, Passkey） | `'use client'`必須。appIdはPrivy Dashboardから取得 |
| permissionless | ^0.3 | ERC-4337 SmartAccount作成 | viem ^2との組み合わせ。bundlerClient作成にPimlico API key必要 |
| viem | ^2.41.2 | Ethereum interactions | 既存。変更不要 |

**削除パッケージ:**

| パッケージ | 理由 |
|-----------|------|
| @account-kit/react | Privy + permissionless.jsに置換 |
| @account-kit/infra | 同上 |

### File Structure Requirements

**新規ファイル（このストーリーで作成）:**
```
src/
  contexts/
    PrivyConfig.tsx           ← 新規: PrivyProviderラッパー
  types/
    wallet.ts                 ← 新規: UnifiedWallet型定義
  hooks/
    useWallet.ts              ← 更新: AA + MetaMask統一
    useWallet.test.ts         ← 新規: useWalletテスト
  lib/
    config.ts                 ← 更新: Privy/Pimlico env追加
    config.test.ts            ← 更新: env testsTes追加
  components/
    Login.tsx                 ← 更新: AA loginボタン追加
  app/
    providers.tsx             ← 更新: PrivyProvider追加
```

**削除ファイル:**
```
src/
  lib/
    alchemy.ts                ← 削除: Account Kit → Privy置換
```

**変更禁止ファイル:**
- `src/lib/lit.ts` — AA統合は後続ストーリー
- `src/lib/irys.ts` — AA統合は後続ストーリー
- `src/lib/encryption.ts` — Naga移行はEpic 4
- `src/types/services.ts` — `walletClient: unknown`の型変更は後続ストーリー
- `src/types/errors.ts` — 変更不要
- `src/types/pipeline.ts` — 変更不要
- `vitest.config.ts` — 変更不要
- `playwright.config.ts` — 変更不要

### Testing Requirements

**テストファイル:**

| ファイル | テスト内容 | テスト数（目安） |
|---------|----------|--------------|
| `src/hooks/useWallet.test.ts` | AA接続・MetaMask接続・disconnect・エラーハンドリング | 6-8 |
| `src/lib/config.test.ts`（追加） | NEXT_PUBLIC_PRIVY_APP_ID必須検証、PIMLICO optional検証 | 2-3 |

**モック方針:**
- Privy SDKのhooks（`usePrivy`, `useLogin`）をモック
- `window.ethereum`をモック（MetaMaskテスト）
- permissionless.jsのSmartAccount作成をモック

**テスト必須ルール準拠:**
- Zodスキーマ変更あり → config.test.tsにテスト必須
- フック層の状態管理ロジック → useWallet.test.ts必須
- UIコンポーネント（Login.tsx） → E2Eでカバー（PoC段階ではUnitテスト不要）

### Project Context Reference

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2] — Acceptance Criteria原文
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 2: Authentication & Security] — AA/MetaMask統合パターン、permissionless.js + Pimlico選定理由
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 4: Frontend Architecture] — Compose Providers、ServiceProvider DI
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — 命名規則、Result型、ファクトリパターン
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Core User Experience] — 3ステップオンボーディング、初回ログインのMake-or-Break
- [Source: _bmad-output/implementation-artifacts/1-1-project-foundation-security-update.md] — 前回ストーリーの学習、確立パターン
- [Source: Privy Docs] — @privy-io/react-auth v3.x セットアップ
- [Source: Pimlico Docs] — permissionless.js v0.3.x + Pimlico integration

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- PrivyProvider SSG対応: PrivyProviderがビルド時静的生成でApp ID検証エラーを出すため、`useSyncExternalStore`でクライアントサイドのみレンダリングする方式に変更
- permissionless.js型互換: Privy `EIP1193Provider`とpermissionless.js `EthereumProvider`の型不一致を`request`メソッドラッパーで解決
- viem アップグレード: permissionless@0.3.4がviem@^2.44.4を要求するため、viem 2.41.2→2.46.0にアップグレード
- PIMLICO_API_KEY: Dev Notesに従い、PoC段階ではクライアントサイドからbundler/paymaster呼び出しが必要なため`NEXT_PUBLIC_PIMLICO_API_KEY`としてclientEnvSchemaに配置

### Completion Notes List

- Task 1: @privy-io/react-auth@3.13.1, permissionless@0.3.4をインストール。@account-kit/react, @account-kit/infraを削除。Zodスキーマに`NEXT_PUBLIC_PRIVY_APP_ID`(required)と`NEXT_PUBLIC_PIMLICO_API_KEY`(optional)を追加。5テスト追加
- Task 2: PrivyProviderWrapperを作成、composeProviders配列にWalletProviderの前に配置。useSyncExternalStoreでSSG対応
- Task 3: UnifiedWallet型を定義。useWalletをリファクタしてAA接続（Privy + permissionless.js SimpleSmartAccount）とMetaMask接続を統一インターフェースで提供
- Task 4: Login.tsxにPrivyログインボタン（モーダルでGoogle/Passkey選択）、MetaMask接続ボタン、AA失敗時のMetaMaskフォールバック（FR5）、接続方式の識別表示を実装
- Task 5: alchemy.tsを削除（参照なし確認済み）
- Task 6: useWallet.test.ts（8テスト）とconfig.test.ts追加分（5テスト）を作成。全66テストパス
- Task 7: build ゼロエラー、test 全パス、lint ゼロ警告（変更ファイル対象）。手動確認（7.4）はユーザー実施待ち

### Change Log

- 2026-02-15: Story 1.2 AA Login実装完了（全7タスク）
- 2026-02-15: Senior Developer Review (AI) — 2 HIGH, 5 MEDIUM, 3 LOW 検出。HIGHとMEDIUM 7件を修正。テスト68件全パス、ビルドゼロエラー。修正内容: H1(isConnecting stuck on modal dismiss), H2(MetaMaskエラーがAA失敗として表示), M1(owner型安全性), M2(useEffect依存安定化), M3(アドレスバリデーション追加), M4(AAセットアップテスト追加), M5(File List .gitignore追記)

### File List

**新規ファイル:**
- src/contexts/PrivyConfig.tsx — PrivyProviderラッパー（SSG対応）
- src/types/wallet.ts — UnifiedWallet型定義
- src/hooks/useWallet.test.ts — useWalletテスト（10テスト）

**更新ファイル:**
- package.json — @privy-io/react-auth, permissionless追加。@account-kit/react, @account-kit/infra削除。viem 2.46.0
- pnpm-lock.yaml — 依存ロックファイル更新
- .env.example — NEXT_PUBLIC_PRIVY_APP_ID, NEXT_PUBLIC_PIMLICO_API_KEY追加
- .gitignore — .kiro/, .claude ディレクトリ追加
- src/lib/config.ts — clientEnvSchemaにPrivy/Pimlico環境変数追加
- src/lib/config.test.ts — Privy環境変数バリデーションテスト追加（5テスト）。既存テストにPRIVY_APP_ID設定追加
- src/hooks/useWallet.ts — Privy + permissionless.js AA接続統合。UnifiedWallet型に準拠。コードレビュー修正: lastAttemptedMethod追加、アドレスバリデーション、useEffect依存安定化、Privyモーダルdismiss対応
- src/types/wallet.ts — UnifiedWallet型にlastAttemptedMethod追加
- src/contexts/WalletContext.tsx — UnifiedWallet型に更新
- src/components/Login.tsx — AA/MetaMask統一ログインUI、FR5フォールバック。コードレビュー修正: エラー判定ロジックをlastAttemptedMethodベースに修正
- src/app/providers.tsx — PrivyProviderWrapper追加

**削除ファイル:**
- src/lib/alchemy.ts — Account Kit未使用のため削除
