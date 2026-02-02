# アーキテクチャドキュメント

## 1. アーキテクチャ概要

DecentralizedVideoは、複数の分散型プロトコルをオーケストレーションするクライアントサイド中心のアーキテクチャを採用しています。サーバーサイドロジックは最小限に抑え、主要な処理はブラウザ上で実行されます。

### アーキテクチャパターン
- **フロントエンド:** Next.js App Router（コンポーネントベース）
- **バックエンド:** 最小限のAPI Routes（Irys GraphQLプロキシのみ）
- **外部サービス統合:** Livepeer API、Lit Protocol P2Pネットワーク、Irys Gateway
- **スマートコントラクト:** Polygon Amoyテストネット上のVideoTippingコントラクト

```
┌─────────────────────────────────────────────────────┐
│                    ブラウザ (クライアント)               │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐         │
│  │ React UI │──│  Hooks   │──│  Services │         │
│  │Components│  │useVideo  │  │VideoService│         │
│  │          │  │useWallet │  │LitService  │         │
│  │          │  │useTranscode│ │IrysService │         │
│  │          │  │          │  │LivepeerSvc │         │
│  └──────────┘  └──────────┘  └──────┬────┘         │
└──────────────────────────────────────┼──────────────┘
                                       │
              ┌────────────────────────┼───────────────┐
              │                        │               │
       ┌──────┴──────┐  ┌────────────┴───┐  ┌────────┴──────┐
       │  Livepeer   │  │  Lit Protocol  │  │     Irys      │
       │  Studio API │  │   DatilDev     │  │   Gateway     │
       │             │  │   Network      │  │   + GraphQL   │
       │  - Transcode│  │  - Encrypt     │  │  - Store      │
       │  - TUS Upload│  │  - Decrypt    │  │  - Query      │
       │  - HLS      │  │  - ACC        │  │  - Retrieve   │
       └─────────────┘  └──────────────┘  └───────────────┘
                                                    │
                                           ┌────────┴────────┐
                                           │  Polygon Amoy   │
                                           │  (Smart Contract)│
                                           │  VideoTipping.sol│
                                           └─────────────────┘
```

## 2. サービスレイヤー詳細

### 2.1 VideoService (`src/lib/video.ts`)
全体のオーケストレーション層。アップロード・クエリ・復号アクセスのパイプラインを管理。

**主要メソッド:**
- `uploadVideo()` - 6段階のアップロードパイプライン全体を実行
- `queryVideos()` - Irys GraphQLによる動画検索
- `getVideoMetadata()` - Irys Gateway経由でメタデータ取得
- `getDecryptionAccess()` - Lit Protocol認証チェック
- `loadEncryptedSegments()` - 暗号化セグメントの読み込み

### 2.2 LivepeerService (`src/lib/livepeer.ts`)
Livepeer Studio APIとの統合層。

**主要メソッド:**
- `createAsset()` - アセット作成＋TUSエンドポイント取得
- `uploadWithTus()` - TUSプロトコルによるリジューマブルアップロード
- `getAsset()` / `waitForReady()` - トランスコード状態ポーリング
- `downloadHlsManifest()` - HLSマニフェスト＋セグメントダウンロード

### 2.3 LitService (`src/lib/lit.ts`)
Lit Protocol P2Pネットワークとの統合層。

**主要メソッド:**
- `connect()` - DatilDevネットワーク接続
- `getAuthSig()` - SIWE署名によるAuthSig生成
- `encryptFile()` / `decryptFile()` - ACC準拠の暗号化・復号化

### 2.4 IrysService (`src/lib/irys.ts`)
Irys分散ストレージとの統合層。

**主要メソッド:**
- `getWebIrys()` - ViemV2Adapterを使ったWebUploader初期化
- `uploadData()` - タグ付きデータアップロード（残高チェック付き）
- `queryFiles()` - GraphQLによるファイルクエリ
- `getBalance()` / `fundAccount()` / `getUploadPrice()` - 残高管理

### 2.5 暗号化サービス (`src/lib/encryption.ts`)
HLSセグメント単位の暗号化・復号化ロジック。

**主要関数:**
- `encryptSegment()` / `encryptHlsManifest()` - セグメント暗号化
- `decryptSegment()` - セグメント復号化
- `generateAccessControlConditions()` - ACCパターン生成（public / token-gated / subscription）
- `createDecryptionLoader()` - hls.jsカスタムローダー（未使用、VideoPlayerで直接実装）

## 3. アクセス制御パターン

### 3つのアクセスタイプ:

| タイプ | 条件 | 使用ACC |
|--------|------|---------|
| **public** | 任意のウォレットアドレス | `userAddress != 0x0` |
| **token-gated** | 特定NFT保有者 | ERC721 `balanceOf > 0` |
| **subscription** | サブスクライバー + クリエイターバイパス | カスタムコントラクト `isActiveSubscriber` OR `creatorAddress` |

## 4. スマートコントラクト

### VideoTipping.sol
- **目的:** 動画クリエイターへのチップと収益分配
- **ネットワーク:** Polygon Amoy テストネット
- **依存:** OpenZeppelin ReentrancyGuard
- **フレームワーク:** Foundry (Solidity 0.8.20)

**主要機能:**
- `configureRevenueSplit()` - 動画の収益分配設定（クリエイター + プラットフォーム + 著作権者）
- `tip()` - チップ送信＋自動分配（nonReentrant）
- `getVideoTips()` / `videoTotalTips()` - チップ履歴・合計取得

**収益分配ロジック:**
- クリエイター: 70-90%（デフォルト85%）
- プラットフォーム: 10%（固定）
- 著作権者: 0-20%（設定可能）

## 5. 状態管理

### React Context
- **WalletContext** (`src/contexts/WalletContext.tsx`) - グローバルウォレット状態

### Custom Hooks
- **useWallet** - MetaMask接続・切断・アカウント変更監視
- **useVideo** - 動画アップロード・クエリ・復号アクセス
- **useTranscode** - Livepeerトランスコード状態ポーリング（5秒間隔）

### 状態フロー
```
WalletProvider (Context)
  └── useWallet (MetaMask状態)
       ├── address: string | null
       ├── walletClient: WalletClient | null
       ├── isConnecting: boolean
       └── isConnected: boolean

useVideo (動画操作)
  ├── uploadProgress: UploadProgress | null
  ├── videos: VideoListItem[]
  └── isLoading / isUploading / errors

useTranscode (トランスコード監視)
  ├── status: LivepeerAsset["status"] | null
  ├── isPolling: boolean
  └── startPolling() / stopPolling()
```

## 6. API Routes

### `GET /api/videos` (`src/app/api/videos/route.ts`)
サーバーサイドのIrys GraphQLプロキシ。

**クエリパラメータ:**
- `creator` - クリエイターアドレスでフィルタ
- `category` - カテゴリでフィルタ
- `accessType` - アクセスタイプでフィルタ
- `limit` - 取得数（デフォルト20）

**レスポンス:** `{ videos: VideoMetadata[], total: number }`

## 7. 環境変数

| 変数名 | 必須 | 用途 |
|--------|------|------|
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Yes | Alchemy APIキー |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | Yes | WalletConnect プロジェクトID |
| `NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID` | No | ガスポリシーID |
| `NEXT_PUBLIC_LIVEPEER_API_KEY` | No | Livepeer APIキー |
| `LIVEPEER_WEBHOOK_SECRET` | No | Livepeer Webhookシークレット |
| `NEXT_PUBLIC_TIPPING_CONTRACT` | No | VideoTippingコントラクトアドレス |
| `NEXT_PUBLIC_PLATFORM_ADDRESS` | No | プラットフォームウォレットアドレス |
| `NEXT_PUBLIC_PLATFORM_FEE_PERCENT` | No | プラットフォーム手数料%（デフォルト10） |
