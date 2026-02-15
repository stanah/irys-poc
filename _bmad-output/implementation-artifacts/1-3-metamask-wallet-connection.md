# Story 1.3: MetaMaskウォレット接続でクリエイターがログインできる

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **クリエイター（Web3ネイティブ）**,
I want **MetaMaskウォレットで直接接続する**,
So that **既存のウォレットを使ってすぐにプラットフォームを利用できる**.

## Acceptance Criteria (BDD)

### AC1: MetaMaskウォレット接続の成功フロー

**Given** MetaMask拡張がインストールされたブラウザで未ログインの状態
**When** 「MetaMaskで接続」ボタンを押す
**Then** MetaMaskの接続承認ポップアップが表示される
**And** 承認後、Viem経由でウォレットが接続されWalletContextに状態が反映される

### AC2: MetaMask未インストール時のインストール案内

**Given** MetaMaskが未インストールのブラウザ
**When** 「MetaMaskで接続」ボタンを押す
**Then** MetaMaskインストールへの案内が表示される

### AC3: 統一Walletインターフェースの完全互換

**Given** MetaMaskが接続済みの状態
**When** 統一Walletインターフェース経由でウォレット情報を取得する
**Then** AA接続時と同一のインターフェースでアドレス取得・トランザクション署名が可能
**And** コンポーネント層が認証方式（AA/MetaMask）を意識しない

## Tasks / Subtasks

- [x] **Task 1: MetaMask未インストール時のインストール案内UI実装** (AC: #2)
  - [x] 1.1 `useWallet.ts`の`connectWithMetaMask`で`window.ethereum`未検出時に、エラー文字列ではなく構造化された案内状態を設定する（MetaMaskダウンロードURL: `https://metamask.io/download/` を含む）
  - [x] 1.2 `Login.tsx`にMetaMask未インストール検出時の案内UIを追加: 「MetaMaskがインストールされていません」メッセージ + ダウンロードリンクボタン
  - [x] 1.3 `pnpm build`でビルドエラーなしを確認

- [x] **Task 2: MetaMask接続時のPolygon Amoyネットワーク検証・自動切替** (AC: #1)
  - [x] 2.1 `useWallet.ts`の`connectWithMetaMask`に接続後のチェーンID検証ロジックを追加（Polygon Amoy: chainId `0x13882` / 80002）
  - [x] 2.2 チェーンIDが不一致の場合、`wallet_switchEthereumChain`を実行。未登録の場合は`wallet_addEthereumChain`でPolygon Amoyを追加
  - [x] 2.3 ネットワーク切替失敗時のエラーハンドリング: ユーザー向けメッセージ「Polygon Amoyテストネットへの切り替えに失敗しました」
  - [x] 2.4 MetaMask `chainChanged`イベントのリスニングを追加し、ネットワーク変更時にstate更新
  - [x] 2.5 `pnpm build`でビルドエラーなしを確認

- [x] **Task 3: MetaMask接続フローのテスト作成** (AC: #1, #2, #3)
  - [x] 3.1 `src/hooks/useWallet.test.ts`にMetaMask未インストール検知テストを追加（window.ethereum未定義時）
  - [x] 3.2 MetaMask接続成功テストの強化: chainId検証・ネットワーク切替のモックテスト
  - [x] 3.3 MetaMask chainChangedイベントハンドリングのテスト
  - [x] 3.4 統一Walletインターフェース互換テスト: MetaMask接続後にUnifiedWallet型の全フィールドが正しく設定されることを検証
  - [x] 3.5 `pnpm test`で全テストパス確認

- [x] **Task 4: 最終検証** (AC: #1-3)
  - [x] 4.1 `pnpm build` — ゼロエラー
  - [x] 4.2 `pnpm test` — 全テストパス
  - [x] 4.3 `pnpm lint` — ゼロ警告（変更ファイル対象）

## Dev Notes

### 重要: Story 1.2で実装済みの内容（変更不要部分の明確化）

**Story 1.2で以下のMetaMask関連機能はすでに実装済み — これらの基本ロジックは再実装しないこと:**

1. `useWallet.ts` → `connectWithMetaMask()`: `window.ethereum`経由の`eth_requestAccounts`呼び出し、Viem `createWalletClient`の作成、アドレスバリデーション（`ETH_ADDRESS_RE`）
2. `useWallet.ts` → `accountsChanged`イベントリスナー: MetaMaskアカウント変更検出・state更新
3. `Login.tsx` → MetaMask接続ボタン: 既存の「MetaMaskで接続」ボタンUI
4. `types/wallet.ts` → `UnifiedWallet`型: AA/MetaMask共通インターフェース
5. `WalletContext.tsx` → `WalletProvider`: useWalletをContext経由で提供
6. `useWallet.test.ts` → MetaMask接続・切断・エラーの基本テスト（10テスト）

**このストーリーの追加実装スコープ:**
- MetaMask未インストール時の**案内UI**（現在はエラー文字列のみ → ダウンロードリンク付きUI）
- MetaMask接続時の**Polygon Amoyネットワーク検証・自動切替**（現在はネットワーク検証なし）
- **chainChangedイベントリスナー**（現在はaccountsChangedのみ）
- テストの強化

### Architecture Compliance（必須遵守ルール）

**Story 1.1/1.2で確立済みのパターン — 厳守:**

- **命名規則:** Interface = プレフィックスなしPascalCase、フック = `use`プレフィックス+camelCase、テスト = `.test.ts`（コロケーション）
- **Result型パターン:** サービス層のみ。フック層（`useWallet`）はResult型不要、`state.error`に格納
- **Provider合成:** `composeProviders()`使用、手動ネスティング禁止
- **セキュリティ（NFR-S1）:** ウォレット秘密鍵はサーバーサイドに送信・保存しない
- **環境変数:** `env.`経由でアクセス。`process.env`直接参照禁止
- **`pnpm build`は各タスク完了ごとに実行** — 型エラーの早期検出

### Technical Requirements

#### Task 1: MetaMask未インストール案内

**現状のコード（useWallet.ts:146-153）:**
```typescript
if (typeof window === "undefined" || !window.ethereum) {
  setState((prev) => ({
    ...prev,
    error: "MetaMask is not installed",
    lastAttemptedMethod: "metamask",
  }));
  return;
}
```

**改善方針:**
- エラー文字列は維持しつつ、Login.tsx側で`error === "MetaMask is not installed"`を検出して案内UIを表示
- useWallet.ts側の変更は最小限（エラー文字列の変更不要）
- Login.tsx側に条件分岐UIを追加

**MetaMask案内UI設計:**
```
┌──────────────────────────────────────┐
│  🦊 MetaMaskがインストールされていません │
│                                      │
│  MetaMaskはブラウザ拡張として利用できる   │
│  Ethereumウォレットです。              │
│                                      │
│  [MetaMaskをインストール ↗]            │
│  (https://metamask.io/download/)     │
└──────────────────────────────────────┘
```

**CRITICAL:** `window.ethereum`はMetaMask以外のウォレット拡張でも注入される場合がある。このPoCではMetaMask前提で実装し、マルチウォレット対応はPost-MVPで検討。

#### Task 2: ネットワーク検証・自動切替

**Polygon Amoyネットワーク情報:**
```typescript
const POLYGON_AMOY = {
  chainId: "0x13882", // 80002
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: ["https://rpc-amoy.polygon.technology/"],
  blockExplorerUrls: ["https://amoy.polygonscan.com/"],
};
```

**実装パターン:**
```typescript
// connectWithMetaMask内、eth_requestAccounts成功後に追加
const chainId = await window.ethereum.request({ method: "eth_chainId" });
if (chainId !== "0x13882") {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x13882" }],
    });
  } catch (switchError: unknown) {
    // 4902 = chain not added
    if ((switchError as { code?: number }).code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [POLYGON_AMOY],
      });
    } else {
      throw switchError;
    }
  }
}
```

**chainChangedイベントリスナー:**
- `accountsChanged`の隣に追加（useEffect内）
- チェーンが変更された場合: Polygon Amoy以外 → `disconnect()`
- Polygon Amoyに戻った場合 → 再接続不要（すでに接続状態）

**注意:** `chainChanged`イベントのリスナー追加は`state.connectionType === "metamask"`の場合のみ。AA接続時はMetaMaskのネットワーク変更は無関係。

#### Task 3: テスト

**追加テストケース（useWallet.test.ts）:**

| テスト | 検証内容 |
|-------|---------|
| MetaMask未インストール検知 | `window.ethereum`未定義時に"MetaMask is not installed"エラー設定 |
| ネットワーク不一致→切替成功 | chainId不一致検知→`wallet_switchEthereumChain`呼出→成功 |
| ネットワーク未追加→追加成功 | 4902エラー→`wallet_addEthereumChain`呼出→成功 |
| ネットワーク切替拒否 | ユーザーが切替を拒否→エラー状態設定 |
| chainChangedイベント→disconnect | Polygon Amoy以外に変更→disconnect呼出 |
| UnifiedWallet互換性 | MetaMask接続後、全フィールド（address, walletClient, connectionType, isConnected等）が正しく設定 |

**モック方針:**
- `window.ethereum.request`をモック（eth_requestAccounts, eth_chainId, wallet_switchEthereumChain, wallet_addEthereumChain）
- `window.ethereum.on`/`removeListener`をモック
- Privy SDKのhooks（usePrivy, useWallets）をモック（Story 1.2で確立済みパターンを踏襲）

### Previous Story Intelligence（Story 1.2からの学習）

**Story 1.2で確立されたパターン — 厳守:**
1. **Zodスキーマ変更時はテスト必須** — このストーリーではconfig.ts変更なし
2. **`pnpm build`は各タスク完了ごとに実行** — 型エラーの早期検出
3. **Provider合成は`composeProviders()`** — 手動ネスティング禁止
4. **ethAddressSchema使用** — 0x hex検証付きEthereumアドレスバリデーション（config.tsに定義済み）

**Story 1.2のコードレビューで修正された問題を繰り返さないこと:**
- H1: isConnectingがモーダルdismissで stuck → `aaLoginPending` refで対応済み
- H2: MetaMaskエラーがAA失敗として表示 → `lastAttemptedMethod`で判定修正済み
- M2: useEffect依存配列の安定化 → `embeddedWalletAddress`プリミティブ使用
- M3: アドレスバリデーション → `ETH_ADDRESS_RE`で検証

**Story 1.2で作成されたファイル一覧（このストーリーで更新するもの）:**
- `src/hooks/useWallet.ts` — Task 2で更新（ネットワーク検証追加）
- `src/hooks/useWallet.test.ts` — Task 3で更新（テスト追加）
- `src/components/Login.tsx` — Task 1で更新（案内UI追加）

**変更禁止ファイル:**
- `src/lib/config.ts` — このストーリーでは環境変数変更なし
- `src/lib/config.test.ts` — 同上
- `src/contexts/PrivyConfig.tsx` — Privy設定変更なし
- `src/types/wallet.ts` — UnifiedWallet型変更不要（現行型で十分）
- `src/contexts/WalletContext.tsx` — 変更不要
- `src/app/providers.tsx` — Provider構成変更不要
- `src/lib/lit.ts` — AA/MetaMask統合は後続ストーリー
- `src/lib/irys.ts` — 同上
- `src/lib/encryption.ts` — Naga移行はEpic 4
- `src/types/errors.ts`, `src/types/services.ts`, `src/types/pipeline.ts` — 変更不要
- `vitest.config.ts`, `playwright.config.ts` — 変更不要

### Git Intelligence

**Story 1.1/1.2の実装はworking tree上の未コミット変更として存在（メインブランチ未マージ）:**
- 直近のgit commitはドキュメント系のみ（166826a〜）
- 実装コードはunstaged changes

**未コミットの変更（git status — Story 1.2完了時点）:**
- 更新: `package.json`, `pnpm-lock.yaml`, `providers.tsx`, `config.ts`, `Login.tsx`, `useWallet.ts`, `WalletContext.tsx`
- 新規: `PrivyConfig.tsx`, `wallet.ts`, `useWallet.test.ts`, `compose-providers.tsx`, `config.test.ts`, `vitest.config.ts`, `playwright.config.ts`, 型定義ファイル群

### Library/Framework Requirements

| パッケージ | バージョン | 用途 | 注意事項 |
|-----------|-----------|------|---------|
| viem | ^2.46.0 | Ethereum interactions（MetaMask接続・WalletClient作成） | Story 1.2でアップグレード済み |

**新規パッケージ追加なし** — このストーリーでは追加依存は不要

### File Structure Requirements

**更新ファイル（このストーリーで変更）:**
```
src/
  hooks/
    useWallet.ts              ← 更新: ネットワーク検証・chainChangedリスナー追加
    useWallet.test.ts         ← 更新: MetaMask固有テスト追加
  components/
    Login.tsx                 ← 更新: MetaMask未インストール案内UI追加
```

**新規ファイルなし**

### Testing Requirements

**テストファイル:**

| ファイル | テスト追加内容 | テスト数（目安） |
|---------|-------------|--------------|
| `src/hooks/useWallet.test.ts`（追加） | MetaMask未インストール案内、ネットワーク検証・切替、chainChangedイベント、UnifiedWallet互換性 | 6-8追加 |

**テスト追加のみ、新規テストファイル作成なし**

### Project Context Reference

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3] — Acceptance Criteria原文
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 2: Authentication & Security] — 統一Walletインターフェース、Viem直接接続
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — 命名規則、テストパターン
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Effortless Interactions] — MetaMask接続ボタン→署名→完了のフロー
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Principles] — エラーは行き止まりではなく迂回路
- [Source: _bmad-output/implementation-artifacts/1-2-aa-login-social.md] — 前回ストーリーの学習、確立パターン、コードレビュー修正
- [Source: src/hooks/useWallet.ts] — 現行MetaMask実装（connectWithMetaMask, accountsChanged）
- [Source: src/components/Login.tsx] — 現行ログインUI（MetaMaskボタン、エラー表示）

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- ビルドエラーなし（Task 1, 2, 4で各確認済み）
- 全73テストパス（既存63 + 新規5テスト追加 + 既存テスト5件をネットワーク検証対応に更新）
- 変更対象ファイル3つすべてでlintエラー・警告ゼロ

### Completion Notes List

- **Task 1:** Login.tsxにMetaMask未インストール時の案内UIを追加。Dev Notes方針に従い、useWallet.ts側のエラー文字列はそのまま維持し、Login.tsx側で`error === "MetaMask is not installed"`を検出して案内パネル（ダウンロードリンク付き）を表示。既存のエラー表示は案内UIと排他的に表示されるよう条件分岐を追加。
- **Task 2:** connectWithMetaMask内にPolygon Amoyネットワーク検証ロジックを追加。eth_chainId取得→不一致時はwallet_switchEthereumChain→未登録(4902)時はwallet_addEthereumChain。chainChangedイベントリスナーをaccountsChangedの隣に追加（MetaMask接続時のみ有効）。Polygon Amoy以外へ変更時はdisconnect()を実行。
- **Task 3:** 5テスト追加 — ネットワーク切替成功、ネットワーク追加(4902)成功、ネットワーク切替拒否エラー、chainChangedイベントdisconnect、UnifiedWallet全フィールド互換性テスト。既存テストもeth_chainIdモック対応に更新。コードレビューで3テスト追加（wallet_addEthereumChain拒否、chainChanged noop、chainChangedエラーメッセージ検証）。
- **Task 4:** pnpm build/test/lint全パス確認。

### Change Log

- 2026-02-15: Story 1.3実装完了 — MetaMask未インストール案内UI、Polygon Amoyネットワーク検証・自動切替、chainChangedイベントリスナー、テスト5件追加
- 2026-02-15: コードレビュー修正 — H1: wallet_addEthereumChain失敗時のエラーハンドリング追加、H2: chainChanged切断時のエラーメッセージ追加、M1: eth_chainIdランタイム検証追加、M2: POLYGON_AMOY_NETWORKに意図コメント追加、M3: テスト数記載修正、テスト3件追加（計75テスト全パス）

### File List

- `src/components/Login.tsx` — 更新: MetaMask未インストール案内UI追加（AC2）、エラー表示の条件分岐修正
- `src/hooks/useWallet.ts` — 更新: POLYGON_AMOY_CHAIN_ID/POLYGON_AMOY_NETWORK定数追加、connectWithMetaMask内ネットワーク検証ロジック追加、chainChangedイベントリスナー追加
- `src/hooks/useWallet.test.ts` — 更新: MetaMaskテスト5件追加（ネットワーク切替、ネットワーク追加、切替拒否、chainChanged、UnifiedWallet互換）、既存テストのeth_chainIdモック対応
