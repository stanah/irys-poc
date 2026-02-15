# Story 1.4: プロフィール確認・残高表示・ログアウト

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **ログイン済みユーザー**,
I want **自分のプロフィール情報と残高を確認し、ログアウトできる**,
So that **アカウント状態を把握し、セッションを安全に終了できる**.

## Acceptance Criteria (BDD)

### AC1: プロフィール情報の表示（FR4）

**Given** ログイン済みの状態
**When** プロフィール画面にアクセスする
**Then** ウォレットアドレスが表示される
**And** 接続方式（AA/MetaMask）が識別できる

### AC2: ウォレット残高の表示（FR35）

**Given** ログイン済みの状態
**When** ウォレット残高表示エリアを確認する
**Then** Polygon Amoyテストネット上の残高がETH単位で表示される

### AC3: ログアウト（FR6, NFR-S6）

**Given** ログイン済みの状態
**When** ログアウトボタンを押す
**Then** ウォレット接続が解除され、未ログイン状態に戻る
**And** WalletContextの状態がクリアされる
**And** Litセッション署名がクリアされる（NFR-S6）

## Tasks / Subtasks

- [x] **Task 1: プロフィール表示の強化** (AC: #1)
  - [x] 1.1 `Login.tsx`の接続済み表示エリアを拡張: ウォレットアドレスの完全表示（折りたたみ付き）+ 接続方式ラベル（「AA（スマートアカウント）」/「MetaMask」）を明確に表示
  - [x] 1.2 スマートアカウントアドレス（AA接続時）の表示: `smartAccountAddress`が存在する場合、EOAアドレスとSmart Accountアドレスの両方を表示
  - [x] 1.3 `pnpm build`でビルドエラーなしを確認

- [x] **Task 2: ウォレット残高取得・表示** (AC: #2)
  - [x] 2.1 `useWallet.ts`に残高取得ロジックを追加: viem `createPublicClient`の`getBalance()`を使用してPolygon Amoyの残高を取得
  - [x] 2.2 `WalletState`に`balance: bigint | null`と`isBalanceLoading: boolean`フィールドを追加
  - [x] 2.3 `UnifiedWallet`型に`balance`と`isBalanceLoading`を追加
  - [x] 2.4 接続成功時（connectWithMetaMask / AA setup完了後）に自動的に残高を取得
  - [x] 2.5 残高をETH単位（`formatEther`）で`Login.tsx`に表示（小数点以下4桁）
  - [x] 2.6 残高取得エラー時はフォールバック表示（「残高取得失敗」等、他機能をブロックしない）
  - [x] 2.7 `pnpm build`でビルドエラーなしを確認

- [x] **Task 3: ログアウト機能の強化** (AC: #3)
  - [x] 3.1 `useWallet.ts`の`disconnect()`にLitセッションクリアのフック追加: 現時点ではLitServiceImplが未実装のため、`onDisconnect`コールバック型のクリーンアップフックを設計（将来のLitセッションクリア統合に備える）
  - [x] 3.2 ログアウト時に残高状態もクリアされることを確認（`initialState`に`balance: null`を含める）
  - [x] 3.3 ログアウトボタンのUI改善: 「ログアウト」テキストで日本語化、確認不要（PoC段階）
  - [x] 3.4 `pnpm build`でビルドエラーなしを確認

- [x] **Task 4: テスト作成** (AC: #1, #2, #3)
  - [x] 4.1 `useWallet.test.ts`に残高取得テストを追加: 接続成功後に`getBalance`が呼ばれ、state.balanceが更新されることを検証
  - [x] 4.2 残高取得失敗テスト: getBalance失敗時にbalanceがnullのまま、他機能に影響しないことを検証
  - [x] 4.3 ログアウト時の残高クリアテスト: disconnect後にbalanceがnullにリセットされることを検証
  - [x] 4.4 AA接続時のスマートアカウントアドレス表示テスト（任意: コンポーネントテストはE2Eでカバー方針のため）
  - [x] 4.5 `pnpm test`で全テストパス確認

- [x] **Task 5: 最終検証** (AC: #1-3)
  - [x] 5.1 `pnpm build` — ゼロエラー
  - [x] 5.2 `pnpm test` — 全テストパス
  - [x] 5.3 `pnpm lint` — ゼロ警告（変更ファイル対象）

## Dev Notes

### 重要: Story 1.2/1.3で実装済みの内容（変更不要部分の明確化）

**Story 1.2/1.3で以下の機能はすでに実装済み — これらの基本ロジックは再実装しないこと:**

1. `useWallet.ts` → `connectWithMetaMask()`, `connectWithAA()`, `disconnect()`: 基本接続・切断ロジック
2. `useWallet.ts` → MetaMask `accountsChanged`/`chainChanged`イベントリスナー
3. `Login.tsx` → 接続済み表示（アドレス省略表示、Copy、Disconnectボタン）
4. `Login.tsx` → MetaMask未インストール案内UI
5. `Login.tsx` → AAエラー時のMetaMaskフォールバックリンク
6. `types/wallet.ts` → `UnifiedWallet`型（拡張対象）
7. `WalletContext.tsx` → `WalletProvider`（変更不要）
8. `useWallet.test.ts` → 既存75テスト

**このストーリーの追加実装スコープ:**
- プロフィール表示の**強化**（接続方式ラベルの明確化、Smart Account Address表示）
- **残高取得・表示**（viem `getBalance` + `formatEther`）— 新機能
- ログアウト時の**残高クリア**と**Litセッションクリアのフック設計**
- テストの追加

### Architecture Compliance（必須遵守ルール）

**Story 1.1/1.2/1.3で確立済みのパターン — 厳守:**

- **命名規則:** Interface = プレフィックスなしPascalCase、フック = `use`プレフィックス+camelCase、テスト = `.test.ts`（コロケーション）
- **Result型パターン:** サービス層のみ。フック層（`useWallet`）はResult型不要、`state.error`に格納
- **Provider合成:** `composeProviders()`使用、手動ネスティング禁止
- **セキュリティ（NFR-S1）:** ウォレット秘密鍵はサーバーサイドに送信・保存しない
- **環境変数:** `env.`経由でアクセス。`process.env`直接参照禁止
- **`pnpm build`は各タスク完了ごとに実行** — 型エラーの早期検出

### Technical Requirements

#### Task 1: プロフィール表示の強化

**現状のコード（Login.tsx:28-59 — 接続済みUI）:**
```typescript
if (isConnected && address) {
  const connectionLabel = connectionType === "aa" ? "AA" : "MetaMask";
  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="text-sm">
        <p className="font-semibold text-gray-700">Connected ({connectionLabel})</p>
        <div className="flex items-center gap-2">
          <p className="font-mono text-xs text-gray-500 truncate max-w-[150px]" title={address}>
            {address}
          </p>
          <button onClick={copyAddress} ...>Copy</button>
        </div>
      </div>
      <button onClick={disconnect} ...>Disconnect</button>
    </div>
  );
}
```

**改善方針:**
- `connectionLabel`を日本語化: AA → "AA（スマートアカウント）"、MetaMask → "MetaMask"
- AA接続時に`smartAccountAddress`がある場合、Smart Accountアドレスも表示
- 残高表示エリアを追加（Task 2と統合）
- ログアウトボタンを日本語化（「ログアウト」）

**プロフィールUI設計:**
```
┌─────────────────────────────────────────────────┐
│  接続方式: AA（スマートアカウント）               │
│                                                  │
│  ウォレットアドレス:                              │
│  0x1234...5678  [コピー]                         │
│                                                  │
│  Smart Account:（AA時のみ表示）                   │
│  0xabcd...ef01                                   │
│                                                  │
│  残高: 0.1234 ETH (Polygon Amoy)                 │
│                                                  │
│  [ログアウト]                                     │
└─────────────────────────────────────────────────┘
```

**CRITICAL:** プロフィール表示は既存の`Login.tsx`コンポーネント内のconnected stateセクションを拡張する形で実装する。専用プロフィールページの新規作成は不要（PoC段階では不要な複雑化を避ける）。ヘッダーに表示されるコンパクトなプロフィールセクションで十分。

#### Task 2: ウォレット残高取得

**実装パターン:**
```typescript
// useWallet.ts内 — 残高取得関数
const fetchBalance = useCallback(async (walletAddress: `0x${string}`) => {
  setState((prev) => ({ ...prev, isBalanceLoading: true }));
  try {
    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: http(),
    });
    const balance = await publicClient.getBalance({ address: walletAddress });
    setState((prev) => ({ ...prev, balance, isBalanceLoading: false }));
  } catch {
    // 残高取得失敗は他機能をブロックしない（グレースフルデグラデーション）
    setState((prev) => ({ ...prev, balance: null, isBalanceLoading: false }));
  }
}, []);
```

**残高表示:**
```typescript
import { formatEther } from "viem";
// Login.tsx内
const formattedBalance = balance !== null
  ? `${parseFloat(formatEther(balance)).toFixed(4)} ETH`
  : isBalanceLoading ? "残高取得中..." : "残高取得失敗";
```

**publicClientの管理方針:**
- `createPublicClient`は残高取得のたびに新規作成するのではなく、useWallet内でuseRefで保持するか、接続時に一度作成して再利用する
- 既存のconnectWithMetaMask/AA setupのどちらでもpolygonAmoyチェーンでpublicClientを作成可能
- AA setup内に`createPublicClient`が既にある（useWallet.ts:93-96）のでこれを共有するのが効率的

**CRITICAL:** `publicClient.getBalance()`で取得するアドレスについて:
- MetaMask接続時: `state.address`（EOAアドレス）の残高
- AA接続時: `state.address`（EOAアドレス）の残高をまず表示。`state.smartAccountAddress`の残高は別途表示するとEOAとSA両方の残高が分かりやすい。ただしPoC段階ではEOAアドレスの残高のみで十分とし、SA残高表示はオプショナルとする

#### Task 3: ログアウト機能の強化

**現状のdisconnect（useWallet.ts:232-238）:**
```typescript
const disconnect = useCallback(() => {
  aaLoginPending.current = false;
  if (state.connectionType === "aa" && authenticated) {
    privyLogout();
  }
  setState(initialState);
}, [state.connectionType, authenticated, privyLogout]);
```

**改善方針:**
- `initialState`に`balance: null`と`isBalanceLoading: false`を追加（状態クリア保証）
- Litセッションクリアのフック: 将来LitServiceImplが実装された際に`disconnect()`内で呼び出すためのクリーンアップパターンを設計

**Litセッションクリア設計（NFR-S6準拠）:**
```typescript
// 将来的なLitセッションクリアのためのコールバック型設計
// LitServiceImplが実装されるまではno-op
const disconnect = useCallback(() => {
  aaLoginPending.current = false;
  if (state.connectionType === "aa" && authenticated) {
    privyLogout();
  }
  // NFR-S6: Litセッション署名のクリア（LitService統合時に実装）
  // TODO: litService.clearSession() を呼び出す（Epic 4 Story 4.1で実装予定）
  setState(initialState);
}, [state.connectionType, authenticated, privyLogout]);
```

**注意:** 現時点ではTODOコメントのみで十分。Epic 4のLit Protocol統合時にServiceContext経由でLitServiceを取得し、`clearSession()`を呼び出すパターンに移行する。先行してServiceContextを導入する必要はない（このストーリーのスコープ外）。

#### Task 4: テスト

**追加テストケース（useWallet.test.ts）:**

| テスト | 検証内容 |
|-------|---------|
| MetaMask接続後の残高取得 | connectWithMetaMask成功後にgetBalanceが呼出され、state.balanceが更新される |
| AA接続後の残高取得 | AA setup完了後にgetBalanceが呼出され、state.balanceが更新される |
| 残高取得失敗時のグレースフル処理 | getBalance失敗時にbalanceがnull、他のstate（address等）に影響しない |
| ログアウト時の残高クリア | disconnect後にbalanceがnullにリセットされる |
| isBalanceLoadingの遷移 | 残高取得開始時true、完了/失敗時false |

**モック方針:**
- `createPublicClient`のgetBalanceをモック
- viem `formatEther`は純粋関数なのでモック不要
- 既存テストのモックパターンを踏襲（Story 1.2/1.3で確立済み）

### Previous Story Intelligence（Story 1.2/1.3からの学習）

**Story 1.2/1.3で確立されたパターン — 厳守:**
1. **Zodスキーマ変更時はテスト必須** — このストーリーではconfig.ts変更なし
2. **`pnpm build`は各タスク完了ごとに実行** — 型エラーの早期検出
3. **Provider合成は`composeProviders()`** — 手動ネスティング禁止
4. **ethAddressSchema使用** — 0x hex検証付きEthereumアドレスバリデーション（config.tsに定義済み）

**Story 1.3のコードレビューで修正された問題を繰り返さないこと:**
- H1: wallet_addEthereumChain失敗時のエラーハンドリング → 残高取得でも同様にtry/catchを徹底
- H2: chainChanged切断時のエラーメッセージ → ログアウト時のUI状態クリアを徹底
- M1: eth_chainIdランタイム検証 → 残高取得のアドレスバリデーション（null/undefined検証）

**Story 1.3で更新されたファイル（このストーリーでも更新するもの）:**
- `src/hooks/useWallet.ts` — Task 2, 3で更新（残高取得・ログアウト強化）
- `src/hooks/useWallet.test.ts` — Task 4で更新（テスト追加）
- `src/components/Login.tsx` — Task 1で更新（プロフィール表示強化）

**変更禁止ファイル:**
- `src/lib/config.ts` — このストーリーでは環境変数変更なし
- `src/lib/config.test.ts` — 同上
- `src/contexts/PrivyConfig.tsx` — Privy設定変更なし
- `src/contexts/WalletContext.tsx` — 変更不要（useWalletの戻り値型拡張はUnifiedWallet型で吸収）
- `src/app/providers.tsx` — Provider構成変更不要
- `src/lib/lit.ts` — LitService統合はEpic 4
- `src/lib/irys.ts` — 同上
- `src/lib/encryption.ts` — Naga移行はEpic 4
- `src/types/errors.ts`, `src/types/services.ts`, `src/types/pipeline.ts` — 変更不要
- `vitest.config.ts`, `playwright.config.ts` — 変更不要

### Git Intelligence

**Story 1.1/1.2/1.3の実装はworking tree上の未コミット変更として存在（メインブランチ未マージ）:**
- 直近のgit commitはドキュメント系のみ（166826a〜）
- 実装コードはunstaged changes

**未コミットの変更（git status — Story 1.3完了時点）:**
- 更新: `package.json`, `pnpm-lock.yaml`, `providers.tsx`, `config.ts`, `Login.tsx`, `useWallet.ts`, `WalletContext.tsx`
- 新規: `PrivyConfig.tsx`, `wallet.ts`, `useWallet.test.ts`, `compose-providers.tsx`, `config.test.ts`, `vitest.config.ts`, `playwright.config.ts`, 型定義ファイル群

### Library/Framework Requirements

| パッケージ | バージョン | 用途 | 注意事項 |
|-----------|-----------|------|---------|
| viem | ^2.46.0 | `createPublicClient`, `getBalance`, `formatEther` | Story 1.2でアップグレード済み。追加インストール不要 |

**新規パッケージ追加なし** — このストーリーでは追加依存は不要。viemの`getBalance`と`formatEther`は既存パッケージに含まれる。

### File Structure Requirements

**更新ファイル（このストーリーで変更）:**
```
src/
  hooks/
    useWallet.ts              ← 更新: 残高取得ロジック追加、WalletState拡張、initialState拡張
    useWallet.test.ts         ← 更新: 残高取得・クリアテスト追加
  components/
    Login.tsx                 ← 更新: プロフィール表示強化（接続方式・残高・ログアウト日本語化）
  types/
    wallet.ts                 ← 更新: UnifiedWallet型にbalance, isBalanceLoadingフィールド追加
```

**新規ファイルなし**

### Testing Requirements

**テストファイル:**

| ファイル | テスト追加内容 | テスト数（目安） |
|---------|-------------|--------------|
| `src/hooks/useWallet.test.ts`（追加） | 残高取得成功/失敗、ログアウト時クリア、isBalanceLoading遷移 | 5-6追加 |

**テスト追加のみ、新規テストファイル作成なし**

### Project Context Reference

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4] — Acceptance Criteria原文
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 2: Authentication & Security] — 統一Walletインターフェース
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 5: Infrastructure & Deployment] — 環境変数管理、構造化ログ
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — 命名規則、テストパターン、Result型（フック層では不要）
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Principles] — 段階的透明性（デフォルトはシンプル表示）
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Effortless Interactions] — ゼロ思考アクション設計
- [Source: _bmad-output/implementation-artifacts/1-3-metamask-wallet-connection.md] — 前回ストーリーの学習、確立パターン、コードレビュー修正
- [Source: src/hooks/useWallet.ts] — 現行ウォレット実装（disconnect、connectWithMetaMask、AA setup）
- [Source: src/components/Login.tsx] — 現行接続済みUI（アドレス表示、Disconnect）
- [Source: src/types/wallet.ts] — 現行UnifiedWallet型定義

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- 全テスト118パス（既存108 + 新規5 + 既存初期状態テストにbalance/isBalanceLoading検証追加）
- ビルドエラーなし（既存walletconnect/lit-protocol警告のみ）
- 変更ファイル4つ全てリントゼロエラー・ゼロ警告

### Completion Notes List

- ✅ Task 1: Login.tsxの接続済み表示を日本語化。接続方式ラベル（AA（スマートアカウント）/MetaMask）を明確化。Smart Accountアドレス表示（AA時のみ）を追加。ログアウトボタンを「ログアウト」に日本語化。
- ✅ Task 2: useWallet.tsに`fetchBalance`関数追加。viem `createPublicClient.getBalance()`でPolygon Amoyの残高を取得。接続成功時（MetaMask/AA両方）に自動取得。`formatEther`で小数点以下4桁表示。取得失敗時は「残高取得失敗」表示（他機能非ブロック）。
- ✅ Task 3: disconnect()にNFR-S6準拠のLitセッションクリアTODOコメント追加。initialStateにbalance/isBalanceLoadingを含めることでログアウト時の状態クリアを保証。
- ✅ Task 4: 5テスト追加 — MetaMask接続後残高取得、AA接続後残高取得、残高取得失敗時グレースフル処理、ログアウト時残高クリア、isBalanceLoading遷移。初期状態テストにbalance/isBalanceLoading検証を追加。
- ✅ Task 5: pnpm build/test/lint全パス確認。

### Implementation Plan

- publicClientはモジュールレベルで一度だけ作成し、fetchBalanceとAA setupで共有（レビューM1修正）
- AA setupのuseEffect依存配列にfetchBalanceを追加（安定参照のため影響なし）
- connectWithMetaMaskの依存配列にfetchBalanceを追加
- 既存のモックパターンを踏襲: mockGetBalanceをvi.fn()で作成し、createPublicClientのモック返り値に含めた

### File List

- `src/hooks/useWallet.ts` — 更新: fetchBalance追加、WalletState/initialStateにbalance/isBalanceLoading追加、接続成功時に自動残高取得、disconnect()にLitセッションクリアTODO追加
- `src/hooks/useWallet.test.ts` — 更新: mockGetBalance追加、残高関連5テスト追加、初期状態テストにbalance/isBalanceLoading検証追加
- `src/components/Login.tsx` — 更新: 接続方式ラベル日本語化、Smart Account表示追加、残高表示エリア追加、ログアウトボタン日本語化
- `src/types/wallet.ts` — 更新: UnifiedWallet型にbalance/isBalanceLoadingフィールド追加

### Change Log

- 2026-02-16: Story 1.4実装完了 — プロフィール表示強化（接続方式・SmartAccount表示）、ウォレット残高取得・表示（ETH単位）、ログアウト機能日本語化・残高クリア・Litセッションクリア設計、テスト5件追加（計118テスト全パス）
- 2026-02-16: コードレビュー修正（8件: H1×1, M4×4, L3×3） — fetchBalanceレースコンディション修正（balanceFetchId ref）、createPublicClientモジュールレベル共有化、テストsetTimeout→waitFor置換、isBalanceLoading遷移テスト改善、fetchBalance失敗時console.warn追加
