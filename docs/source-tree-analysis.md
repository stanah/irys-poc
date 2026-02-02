# ソースツリー分析

## ディレクトリ構造

```
irys-poc/
├── src/                              # メインソースコード
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # ルートレイアウト（Providers、フォント設定）
│   │   ├── page.tsx                  # ホームページ（動画一覧、カテゴリフィルタ）
│   │   ├── providers.tsx             # クライアントサイドProvider統合
│   │   ├── globals.css               # グローバルCSS（TailwindCSS v4）
│   │   ├── favicon.ico               # ファビコン
│   │   ├── (auth)/                   # 認証保護ルートグループ
│   │   │   └── upload/
│   │   │       └── page.tsx          # 動画アップロードページ
│   │   ├── watch/
│   │   │   └── [videoId]/
│   │   │       └── page.tsx          # 動画視聴ページ（プレーヤー＋チップ＋メタデータ）
│   │   ├── channel/
│   │   │   └── [address]/
│   │   │       └── page.tsx          # クリエイターチャンネルページ
│   │   └── api/
│   │       └── videos/
│   │           └── route.ts          # 動画クエリAPI（Irys GraphQLプロキシ）
│   │
│   ├── lib/                          # サービスレイヤー（ビジネスロジック）
│   │   ├── video.ts                  # VideoService - オーケストレーション層
│   │   ├── livepeer.ts               # LivepeerService - トランスコード統合
│   │   ├── lit.ts                    # LitService - 暗号化・認証
│   │   ├── irys.ts                   # IrysService - 分散ストレージ
│   │   ├── encryption.ts             # HLSセグメント暗号化・ACC生成
│   │   ├── config.ts                 # サイト設定・環境変数スキーマ
│   │   └── alchemy.ts               # Account Kit設定
│   │
│   ├── hooks/                        # React Custom Hooks
│   │   ├── useWallet.ts              # MetaMask接続管理
│   │   ├── useVideo.ts               # 動画操作（アップロード・クエリ・復号）
│   │   └── useTranscode.ts           # トランスコード状態ポーリング
│   │
│   ├── contexts/                     # React Context Providers
│   │   └── WalletContext.tsx          # ウォレット状態グローバル管理
│   │
│   ├── components/                   # UIコンポーネント
│   │   ├── Login.tsx                 # MetaMask接続/切断ボタン
│   │   ├── UploadForm.tsx            # ファイルアップロードフォーム（レガシー）
│   │   ├── FileList.tsx              # 受信ファイル一覧（レガシー）
│   │   ├── video/                    # 動画関連コンポーネント
│   │   │   ├── VideoUploader.tsx     # 動画アップロードフォーム（メイン）
│   │   │   ├── VideoPlayer.tsx       # HLS再生プレーヤー（暗号化対応）
│   │   │   ├── VideoCard.tsx         # 動画カードUI
│   │   │   └── TranscodeProgress.tsx # アップロード進捗表示（5段階）
│   │   └── monetization/            # マネタイゼーション関連
│   │       └── TippingWidget.tsx     # チップ送信UI
│   │
│   └── types/                        # TypeScript型定義
│       ├── video.ts                  # 動画関連型（VideoMetadata, UploadProgress等）
│       ├── contracts.ts              # スマートコントラクトABI・アドレス
│       └── global.d.ts               # Window.ethereum型拡張
│
├── contracts/                        # Solidity スマートコントラクト
│   ├── src/
│   │   └── VideoTipping.sol          # チップ＆収益分配コントラクト
│   ├── lib/
│   │   ├── forge-std/                # Foundry標準ライブラリ
│   │   └── openzeppelin-contracts/   # OpenZeppelin（ReentrancyGuard）
│   └── foundry.toml                  # Foundry設定
│
├── public/                           # 静的アセット
│   ├── file.svg, globe.svg           # デフォルトNext.jsアイコン
│   ├── next.svg, vercel.svg          # ブランドアイコン
│   └── window.svg
│
├── _bmad/                            # BMAD ワークフローフレームワーク
├── _bmad-output/                     # BMAD 成果物出力
│   ├── brainstorming/                # ブレインストーミング結果
│   ├── planning-artifacts/           # 計画成果物
│   │   └── research/                 # 技術・市場調査
│   └── implementation-artifacts/     # 実装成果物（空）
│
├── docs/                             # プロジェクトドキュメント
│
├── package.json                      # 依存関係・スクリプト
├── pnpm-lock.yaml                    # ロックファイル
├── next.config.ts                    # Next.js設定（webpack fallback）
├── tsconfig.json                     # TypeScript設定
├── eslint.config.mjs                 # ESLint設定
├── postcss.config.mjs                # PostCSS設定
├── mise.toml                         # mise設定（Node 24）
├── .env.example                      # 環境変数テンプレート
├── .gitmodules                       # Gitサブモジュール（contracts/lib）
├── CLAUDE.md                         # Claude Code設定
└── README.md                         # プロジェクトREADME
```

## エントリポイント

| エントリポイント | パス | 説明 |
|----------------|------|------|
| アプリ起動 | `src/app/layout.tsx` | RootLayout + Providers |
| ホームページ | `src/app/page.tsx` | 動画一覧表示 |
| アップロード | `src/app/(auth)/upload/page.tsx` | 認証保護アップロード |
| 動画視聴 | `src/app/watch/[videoId]/page.tsx` | 動画再生＋チップ |
| チャンネル | `src/app/channel/[address]/page.tsx` | クリエイターページ |
| API | `src/app/api/videos/route.ts` | サーバーサイドGraphQLプロキシ |

## レガシーコンポーネント

以下のコンポーネントは元々の「セキュアファイル共有PoC」からの残存物で、動画プラットフォーム機能と共存していますが、動画ワークフローでは使用されていません：

- `src/components/UploadForm.tsx` - ファイル暗号化＋Irysアップロード（送信先指定）
- `src/components/FileList.tsx` - 受信ファイル一覧＋復号ダウンロード

## ファイル統計

| カテゴリ | ファイル数 | 主な拡張子 |
|---------|----------|-----------|
| コンポーネント (TSX) | 10 | .tsx |
| サービス (TS) | 7 | .ts |
| フック (TS) | 3 | .ts |
| 型定義 (TS) | 3 | .ts |
| ページ (TSX) | 5 | .tsx |
| API Routes (TS) | 1 | .ts |
| スマートコントラクト (SOL) | 1 | .sol |
| 設定ファイル | 7 | .ts, .mjs, .json, .toml |
