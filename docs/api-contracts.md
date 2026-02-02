# API コントラクト

## REST API

### `GET /api/videos`

動画メタデータの検索。Irys GraphQLへのサーバーサイドプロキシ。

**パス:** `src/app/api/videos/route.ts`

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `creator` | string | No | クリエイターのウォレットアドレスでフィルタ |
| `category` | string | No | 動画カテゴリでフィルタ |
| `accessType` | string | No | アクセスタイプでフィルタ (public/token-gated/subscription) |
| `limit` | number | No | 取得数 (デフォルト: 20) |

**レスポンス (200):**
```json
{
  "videos": [
    {
      "id": "irys_transaction_id",
      "title": "Video Title",
      "description": "...",
      "thumbnailCid": "irys_cid",
      "duration": 120.5,
      "creatorAddress": "0x...",
      "createdAt": 1706918400000,
      "category": "technology",
      "tags": ["web3", "tutorial"],
      "accessType": "public",
      "transcodeStatus": "completed",
      "renditions": [...],
      "revenueSplit": {
        "creator": 85,
        "platform": 10,
        "copyrightHolders": []
      }
    }
  ],
  "total": 1
}
```

**エラーレスポンス (500):**
```json
{ "error": "Failed to fetch videos" }
```

## 外部API統合

### Irys GraphQL

**エンドポイント:** `https://uploader.irys.xyz/graphql`

**クエリ例:**
```graphql
query {
  transactions(
    tags: [
      { name: "App-Name", values: ["DecentralizedVideo"] }
      { name: "Type", values: ["video-metadata"] }
    ]
    first: 20
    order: DESC
  ) {
    edges {
      node {
        id
        tags { name value }
        timestamp
      }
    }
  }
}
```

### Irys Gateway

**データ取得:** `https://gateway.irys.xyz/{transactionId}`

**用途:**
- 動画メタデータの取得
- 暗号化セグメントの取得
- サムネイル画像の取得

### Livepeer Studio API

**SDK:** `livepeer` npm パッケージ (v3.5.0)

**使用メソッド:**
- `client.asset.create()` - アセット作成 + TUSエンドポイント取得
- `client.asset.get()` - アセット状態取得

**TUSアップロード:**
- `tus-js-client` による リジューマブルアップロード
- リトライ: [0, 3000, 5000, 10000, 20000] ms

**HLSプレイバック:**
- `https://livepeer.studio/api/playback/{playbackId}` - プレイバック情報取得

### Lit Protocol

**ネットワーク:** DatilDev
**SDK:** `@lit-protocol/lit-node-client` v7.3.1

**認証フロー:** SIWE (Sign-In with Ethereum)
- Chain ID: Polygon Amoy
- 有効期限: 1時間

## スマートコントラクトAPI

### VideoTipping (Polygon Amoy)

**アドレス:** `process.env.NEXT_PUBLIC_TIPPING_CONTRACT`

#### `configureRevenueSplit(videoId, creator, creatorPercent, copyrightHolders, copyrightPercentages)`
- **タイプ:** write (nonpayable)
- **パラメータ:**
  - `videoId`: bytes32 (keccak256 of Irys CID)
  - `creator`: address
  - `creatorPercent`: uint256
  - `copyrightHolders`: address[]
  - `copyrightPercentages`: uint256[]
- **制約:** percentages合計 = 100

#### `tip(videoId, message)`
- **タイプ:** write (payable, nonReentrant)
- **パラメータ:**
  - `videoId`: bytes32
  - `message`: string
- **value:** チップ金額 (ETH)
- **イベント:** `TipSent(videoId, sender, amount, message)`
- **自動分配:** プラットフォーム → クリエイター → 著作権者

#### `getVideoTips(videoId) → TipRecord[]`
- **タイプ:** view
- **戻り値:** `{ sender, amount, message, timestamp }[]`

#### `videoTotalTips(videoId) → uint256`
- **タイプ:** view

#### `isVideoConfigured(videoId) → bool`
- **タイプ:** view

#### `getTipCount(videoId) → uint256`
- **タイプ:** view

## Irysタグスキーマ

### 動画メタデータ
| タグ名 | 値 | 必須 |
|--------|-----|------|
| `App-Name` | `DecentralizedVideo` | Yes |
| `Content-Type` | `application/json` | Yes |
| `Type` | `video-metadata` | Yes |
| `Creator` | ウォレットアドレス | Yes |
| `Title` | 動画タイトル | Yes |
| `Category` | カテゴリ名 | Yes |
| `AccessType` | public/token-gated/subscription | Yes |
| `Tag` | タグ文字列（複数可） | No |

### 動画セグメント
| タグ名 | 値 | 必須 |
|--------|-----|------|
| `App-Name` | `DecentralizedVideo` | Yes |
| `Content-Type` | `application/json` | Yes |
| `Type` | `video-segment` | Yes |

### サムネイル
| タグ名 | 値 | 必須 |
|--------|-----|------|
| `App-Name` | `DecentralizedVideo` | Yes |
| `Content-Type` | `image/png` | Yes |
| `Type` | `video-thumbnail` | Yes |
| `Creator` | ウォレットアドレス | Yes |

### レガシー: ファイル共有
| タグ名 | 値 | 必須 |
|--------|-----|------|
| `App-Name` | `SecureFileSharePoC` | Yes |
| `Type` | `EncryptedFile` | Yes |
| `Sender` | 送信元アドレス | Yes |
| `Recipient` | 受信先アドレス | Yes |
