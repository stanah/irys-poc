# プロジェクト概要 - DecentralizedVideo

## エグゼクティブサマリー

DecentralizedVideoは、分散型技術を組み合わせた動画ストリーミングプラットフォームのPoCです。クリエイターが動画をアップロードし、暗号化によるアクセス制御と透明な収益分配を通じて、仲介者なしでコンテンツを収益化できることを実証します。

## 技術スタック概要

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| フレームワーク | Next.js (App Router) | 16.0.8 | フルスタックWebフレームワーク |
| UI | React | 19.2.1 | UIコンポーネント |
| 言語 | TypeScript | ^5 | 型安全な開発 |
| スタイリング | TailwindCSS | ^4 | ユーティリティファーストCSS |
| Ethereum操作 | Viem | ^2.41.2 | ウォレット接続・トランザクション |
| ウォレット抽象化 | Account Kit (Alchemy) | ^4.81.2 | Alchemyインフラ統合 |
| 分散ストレージ | Irys Web Upload | ^0.0.15 | 永続的データ保存 |
| 暗号化 | Lit Protocol | ^7.3.1 | アクセス制御付きファイル暗号化 |
| 動画トランスコード | Livepeer | ^3.5.0 | HLS形式への動画変換 |
| 動画再生 | hls.js | ^1.6.15 | HLSストリーム再生 |
| アップロード | tus-js-client | ^4.3.1 | リジューマブルアップロード |
| 認証 | SIWE (Sign-In with Ethereum) | ^3.0.0 | ウォレットベース認証 |
| バリデーション | Zod | ^4.1.13 | スキーマバリデーション |
| サーバーサイドクエリ | @tanstack/react-query | ^5.90.12 | データフェッチ管理 |
| スマートコントラクト | Solidity (Foundry) | 0.8.20 | チップ＆収益分配 |
| コントラクトライブラリ | OpenZeppelin | - | ReentrancyGuard等 |

## リポジトリ構造

- **タイプ:** モノリス
- **主要言語:** TypeScript, Solidity
- **アーキテクチャパターン:** コンポーネントベースフロントエンド + 分散型サービス統合
- **パッケージマネージャー:** pnpm 10.25.0
- **Node.js:** v24 (mise管理)

## ネットワーク設定

| サービス | ネットワーク | 詳細 |
|---------|-------------|------|
| ウォレット | Polygon Amoy (テストネット) | MetaMask直接接続 |
| Lit Protocol | DatilDev | chain: "polygonAmoy" |
| Irys | メインネットゲートウェイ | uploader.irys.xyz |
| スマートコントラクト | Polygon Amoy | Foundry経由デプロイ |

## データフロー概要

### アップロードパイプライン
1. MetaMask署名でウォレット認証
2. Livepeerに動画アップロード（TUSリジューマブルプロトコル）
3. Livepeerがトランスコード（HLS形式、複数品質）
4. HLSセグメントをダウンロード
5. Lit Protocolでセグメントを暗号化（ACC準拠）
6. 暗号化セグメント＋メタデータをIrysに永続保存

### 視聴パイプライン
1. Irys GraphQLでメタデータクエリ
2. Irys Gatewayから暗号化セグメント取得
3. MetaMask署名でLit Protocol認証
4. アクセス制御条件の検証
5. セグメント復号化
6. hls.jsでストリーミング再生
