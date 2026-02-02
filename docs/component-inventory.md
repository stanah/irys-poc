# コンポーネントインベントリ

## ページコンポーネント

### `page.tsx` (ホーム)
- **パス:** `src/app/page.tsx`
- **責務:** 動画一覧表示、カテゴリフィルタ、ヒーローセクション
- **依存:** `useWalletContext`, `useVideo`, `Login`, `VideoCard`
- **状態:** `mounted`, `selectedCategory`
- **特徴:** カテゴリフィルタ（7カテゴリ + All）、レスポンシブグリッド（1-4列）

### `UploadPage` (アップロード)
- **パス:** `src/app/(auth)/upload/page.tsx`
- **責務:** 認証チェック付き動画アップロードページ
- **依存:** `useWalletContext`, `Login`, `VideoUploader`
- **特徴:** 未接続時はウォレット接続促進UI表示

### `WatchPage` (動画視聴)
- **パス:** `src/app/watch/[videoId]/page.tsx`
- **責務:** 動画再生、メタデータ表示、チップ送信
- **依存:** `videoService`, `VideoPlayer`, `TippingWidget`, `Login`
- **レイアウト:** 2/3 + 1/3 グリッド（プレーヤー＋サイドバー）
- **特徴:** 収益分配表示、ストレージ情報表示、IRysトランザクションリンク

### `ChannelPage` (チャンネル)
- **パス:** `src/app/channel/[address]/page.tsx`
- **責務:** クリエイターの動画一覧表示
- **依存:** `useWalletContext`, `useVideo`, `Login`, `VideoCard`
- **特徴:** グラデーションバナー、アバター（アドレス先頭2文字）、自分のチャンネル判定

## UIコンポーネント

### 認証系

| コンポーネント | パス | 説明 |
|--------------|------|------|
| `Login` | `src/components/Login.tsx` | MetaMask接続/切断ボタン。接続時はアドレス表示＋コピー機能 |

### 動画系

| コンポーネント | パス | 説明 |
|--------------|------|------|
| `VideoUploader` | `src/components/video/VideoUploader.tsx` | 動画アップロードフォーム。ファイルドロップ、メタデータ入力、アクセス制御選択、収益分配スライダー |
| `VideoPlayer` | `src/components/video/VideoPlayer.tsx` | HLS動画プレーヤー。hls.js + Lit Protocol復号。カスタムUI（再生/一時停止、音量、シーク、品質選択、フルスクリーン） |
| `VideoCard` | `src/components/video/VideoCard.tsx` | 動画カード。サムネイル、時間表示、カテゴリバッジ、アクセスアイコン、チップ合計 |
| `TranscodeProgress` | `src/components/video/TranscodeProgress.tsx` | 5段階アップロード進捗表示（Preparing → Uploading → Transcoding → Encrypting → Storing） |

### マネタイゼーション系

| コンポーネント | パス | 説明 |
|--------------|------|------|
| `TippingWidget` | `src/components/monetization/TippingWidget.tsx` | チップ送信UI。プリセット金額（0.001-0.1 ETH）、カスタム金額、メッセージ、最近のチップ履歴表示 |

### レガシー系（ファイル共有PoC）

| コンポーネント | パス | 説明 |
|--------------|------|------|
| `UploadForm` | `src/components/UploadForm.tsx` | ファイル暗号化＋Irysアップロード。送信先アドレス指定式 |
| `FileList` | `src/components/FileList.tsx` | 受信ファイル一覧＋復号ダウンロード |

## コンポーネント依存関係図

```
layout.tsx
└── Providers
    └── WalletProvider (Context)
        ├── page.tsx (ホーム)
        │   ├── Login
        │   └── VideoCard (×N)
        │
        ├── UploadPage
        │   ├── Login
        │   └── VideoUploader
        │       └── TranscodeProgress
        │
        ├── WatchPage
        │   ├── Login
        │   ├── VideoPlayer
        │   └── TippingWidget
        │
        └── ChannelPage
            ├── Login
            └── VideoCard (×N)
```

## デザインパターン

- **スタイリング:** TailwindCSS v4 ユーティリティクラス（一部インラインstyle併用）
- **レイアウト:** `max-w-7xl mx-auto` ベースのセンター揃えレイアウト
- **レスポンシブ:** `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4` 等
- **カラーパレット:** Blue系メイン + Purple/Pink グラデーションアクセント
- **アイコン:** インラインSVG（ライブラリ未使用）
- **ローディング:** CSS `animate-spin` ベースのスピナー
- **クライアントレンダリング:** 全コンポーネントが `"use client"` + `mounted` ハイドレーションガード
