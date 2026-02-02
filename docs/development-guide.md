# 開発ガイド

## 前提条件

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | v24 | ランタイム（mise経由で管理） |
| pnpm | 10.25.0+ | パッケージマネージャー |
| mise | 最新 | ツールバージョン管理 |
| MetaMask | 最新 | ブラウザウォレット拡張 |
| Foundry | 最新 | スマートコントラクト開発（オプション） |

## セットアップ手順

### 1. リポジトリクローン

```bash
git clone https://github.com/stanah/irys-poc.git
cd irys-poc
git submodule update --init --recursive  # contracts/libのサブモジュール
```

### 2. Node.jsバージョン設定

```bash
mise install  # mise.tomlからNode 24をインストール
```

### 3. 依存関係インストール

```bash
pnpm install
```

### 4. 環境変数設定

`.env.example` を `.env.local` にコピーして編集：

```bash
cp .env.example .env.local
```

**必須変数:**
- `NEXT_PUBLIC_ALCHEMY_API_KEY` - [Alchemy Dashboard](https://dashboard.alchemy.com/)から取得
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - [WalletConnect Cloud](https://cloud.walletconnect.com/)から取得

**オプション変数（機能有効化）:**
- `NEXT_PUBLIC_LIVEPEER_API_KEY` - [Livepeer Studio](https://livepeer.studio/)から取得（動画アップロード機能）
- `NEXT_PUBLIC_TIPPING_CONTRACT` - デプロイ済みコントラクトアドレス（チップ機能）
- `NEXT_PUBLIC_PLATFORM_ADDRESS` - プラットフォーム収益受取アドレス

### 5. MetaMask設定

1. MetaMaskにPolygon Amoyテストネットを追加
2. テスト用ETHを取得（Polygon Amoy Faucet）
3. テスト用のIrys残高をファンド

## 開発コマンド

```bash
pnpm dev      # 開発サーバー起動 (http://localhost:3000)
pnpm build    # プロダクションビルド (--webpackフラグ使用)
pnpm start    # プロダクションサーバー起動
pnpm lint     # ESLintの実行
```

**ビルド注意事項:**
- `next build --webpack` フラグを使用（Turbopackではなく）
- Webpack設定で `fs`, `net`, `tls` 等のNode.jsモジュールをブラウザ向けにfallback無効化
- `pino-pretty`, `lokijs`, `encoding` も無効化
- `tap`, `tape`, `why-is-node-running` のエイリアスも無効化（pino/thread-stream問題回避）

## スマートコントラクト開発

```bash
cd contracts
forge build                           # コンパイル
forge test                            # テスト実行
forge script script/Deploy.s.sol \    # デプロイ
  --rpc-url polygon_amoy \
  --broadcast
```

**Foundry設定:**
- Solidity: 0.8.20
- オプティマイザー: 有効（200 runs）
- リマッピング: OpenZeppelin (`@openzeppelin/contracts/`) + forge-std

## プロジェクト構成のポイント

### パスエイリアス
TypeScriptの `@/*` パスエイリアスが `./src/*` にマッピングされています：
```typescript
import { useWallet } from "@/hooks/useWallet";
import { videoService } from "@/lib/video";
```

### クライアントサイド重視
ほぼ全てのコンポーネントが `"use client"` ディレクティブを持っています。サーバーサイドレンダリングは最小限です。

### サービスシングルトン
各サービスはモジュールレベルでシングルトンインスタンスをエクスポートしています：
```typescript
export const litService = new LitService("polygonAmoy");
export const irysService = new IrysService();
export const livepeerService = new LivepeerService();
export const videoService = new VideoService();
```

### ルートグループ
`(auth)` ルートグループは認証保護ページを示しますが、Next.jsミドルウェアレベルのガードは実装されておらず、コンポーネントレベルで `isConnected` チェックを行っています。

## テスト

現在、自動テストは設定されていません。手動テストのみです。

## 既知の制約

- Turbopackは未サポート（Webpack使用）
- 自動テストフレームワーク未設定
- CI/CDパイプライン未設定
- MetaMask直接接続のみ（WalletConnect UIは未実装）
- Irys残高管理はユーザー手動
