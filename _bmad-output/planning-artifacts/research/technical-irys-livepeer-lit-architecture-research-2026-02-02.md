---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Irys・Livepeer・Lit Protocol アーキテクチャ設計'
research_goals: '3プロトコルのアーキテクチャ設計に必要な技術情報を、既存irys-poc実装と比較しつつ調査'
user_name: 'stanah'
date: '2026-02-02'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical

**Date:** 2026-02-02
**Author:** stanah
**Research Type:** Technical

---

## Research Overview

Irys（プログラマブルデータチェーン）、Livepeer（分散型トランスコーディング）、Lit Protocol（分散型アクセス制御）の3技術について、アーキテクチャ設計に必要な技術情報を調査する。既存irys-poc実装との比較を通じて、設計改善点と最新ベストプラクティスを明確にする。

---

## Technical Research Scope Confirmation

**Research Topic:** Irys・Livepeer・Lit Protocol アーキテクチャ設計
**Research Goals:** 3プロトコルのアーキテクチャ設計に必要な技術情報を、既存irys-poc実装と比較しつつ調査

**Technical Research Scope:**

- Architecture Analysis - 各プロトコルの設計パターン、システムアーキテクチャ、ネットワーク構成
- Implementation Approaches - SDK/APIの最新状態、推奨パターン、既存実装との差異
- Technology Stack - バージョン、依存関係、互換性
- Integration Patterns - 3プロトコル間の連携、データフロー設計
- Performance Considerations - スケーラビリティ、コスト最適化、制約事項

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-02-02

## Technology Stack Analysis

### 既存実装の技術スタック

現在のirys-poc実装で使用中のバージョン：

| パッケージ | 現行バージョン | 用途 |
|---|---|---|
| `@irys/web-upload` | ^0.0.15 | ブラウザ側Irysアップロード |
| `@irys/web-upload-ethereum` | ^0.0.16 | Ethereum支払い統合 |
| `@irys/web-upload-ethereum-viem-v2` | ^0.0.17 | Viem v2アダプタ |
| `@lit-protocol/lit-node-client` | ^7.3.1 | Litノード接続 |
| `@lit-protocol/encryption` | ^7.3.1 | 暗号化/復号化 |
| `livepeer` | ^3.5.0 | Livepeer Studio SDK |
| `viem` | ^2.41.2 | Ethereum操作 |
| `siwe` | ^3.0.0 | Sign-In with Ethereum |
| `next` | 16.0.8 | フレームワーク |
| `react` | 19.2.1 | UIライブラリ |

---

### 1. Irys — プログラマブルデータチェーン

#### アーキテクチャ概要

Irysは世界初のL1プログラマブルデータチェーンであり、オンチェーンデータのアップロード、スマートコントラクトのデプロイ、そしてスマートコントラクトによるオンチェーンデータへの検証可能な計算を可能にする。[High Confidence]

**コアアーキテクチャ：**
- **マルチレジャーストレージ** — 一時ストレージと永続ストレージを動的に管理。Submit Ledger（バッファ）→検証後に永続化
- **IrysVM** — EVM互換の実行レイヤー。既存のEVMツール・ワークフローをそのまま利用可能。プログラマブルデータオプコードにより数行のコード追加で拡張可能
- **3マーケット価格モデル** — 実行、期間ストレージ、永続ストレージの料金を分離

**パフォーマンス（公称値）：**
- 100,000データトランザクション/秒（Filecoinの6,000倍）
- アップロード8ms〜
- 永続ストレージ約$0.05/GB（エンタープライズ$0.03/GB）
- Arweaveの16倍安価（固定価格）

_Source: [Irys Docs](https://docs.irys.xyz/), [Irys Whitepaper](https://irys.xyz/assets/IrysWhitepaper.pdf), [Blockchain Magazine](https://blockchainmagazine.com/press-release/irys-arrives-the-first-programmable-datachain-purpose-built-for-ai-launches-mainnet/)_

#### SDK構成（現行 vs 最新）

**既存実装（irys-poc）のパターン：**
```typescript
// src/lib/irys.ts — WebUploader + ViemV2Adapter
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { ViemV2Adapter } from "@irys/web-upload-ethereum-viem-v2";

const irysUploader = await WebUploader(WebEthereum).withAdapter(
  ViemV2Adapter(walletClient, { publicClient })
);
```

**評価：** 既存実装は最新の推奨パターンに準拠している。モジュラーSDK（`@irys/web-upload`系）を正しく使用しており、旧来の`@irys/sdk`からの移行済み。[High Confidence]

**注意点：**
- 旧`@irys/sdk`（モノリシック）は非推奨。Arweaveバンドラも非推奨
- 現行SDKはトークン別パッケージ設計（依存関係の軽量化）
- サーバーサイドは`@irys/upload` + `@irys/upload-ethereum`が対応パッケージ
- Polygon、Base、Arbitrum、Linea等のチェーンをサポート

_Source: [Irys SDK Docs](https://docs.irys.xyz/build/d/sdk/setup), [Irys Browser Guide](https://docs.irys.xyz/build/d/irys-in-the-browser), [GitHub](https://github.com/Irys-xyz/js-sdk)_

#### L1移行ステータス

- テストネットでは永続データアップロードをサポート中。一時データは近日対応予定
- メインネットローンチ時にバンドラ上のデータはテストネット→メインネットへ移行（トランザクションID不変）
- 移行準備が整わない開発者は既存バンドラ・Arweaveゲートウェイをそのまま使用可能
- **2026ロードマップ**: ステーキング委任機能、IrysVMスケーリング

_Source: [Irys Migration Guide](https://docs.irys.xyz/build/d/migrating)_

#### 既存実装との差異分析

| 項目 | 既存実装 | 最新推奨 | 対応要否 |
|---|---|---|---|
| SDK | `@irys/web-upload` 系 | 同左（最新準拠） | ✅ 対応済み |
| アダプタ | ViemV2Adapter | 同左 | ✅ 対応済み |
| ネットワーク | Mainnet gateway | L1テストネット移行検討 | ⚠️ 要検討 |
| GraphQL | `uploader.irys.xyz/graphql` | L1移行後はエンドポイント変更の可能性 | ⚠️ 要監視 |
| 支払いチェーン | Polygon Amoy | L1ではIRYSトークン支払い | ⚠️ 要計画 |

---

### 2. Lit Protocol — 分散型アクセス制御・暗号化

#### ⚠️ 重大な発見：Datilネットワーク終了予定

**Datil（V0）は2026年2月25日にシャットダウン予定。** 現在のirys-pocは`datil-dev`ネットワーク + SDK v7.3.1を使用しているため、**Naga（V1）+ SDK v8への移行が必須。** [High Confidence]

_Source: [Lit Protocol — Introducing Datil](https://spark.litprotocol.com/introducing-the-datil-networks/), [Naga Mainnet Announcement](https://spark.litprotocol.com/datil-mainnet-is-live/), [Messari Report](https://messari.io/report/lit-protocol-vincent-launch-litkey-tge-and-naga-mainnet)_

#### アーキテクチャ概要

Litは分散型鍵管理とプライベートコンピュートネットワークであり、3つのコアプリミティブを提供：

1. **分散型署名・ウォレット管理** — MPC TSS + TEEによるECDSA/EdDSA
2. **分散型暗号化/復号化** — MPC TSS + TEEによるアイデンティティベースBLS暗号化スキーム
3. **プライベートコンピュート** — Lit MPC TSSネットワーク上で実行、sealed TEEにより保護

**暗号化フロー：**
- 暗号化は完全にクライアントサイド操作
- 復号化にはLitノード間の1ラウンドのネットワークインタラクションのみ必要
- Identity Parameter = Hash(Access Control Conditions) + Hash(Private Data)

_Source: [Lit Protocol Docs](https://developer.litprotocol.com/), [Encryption Guide](https://developer.litprotocol.com/sdk/access-control/encryption)_

#### V0 (Datil) → V1 (Naga) 主要変更点

| 項目 | Datil (V0) | Naga (V1) | 影響度 |
|---|---|---|---|
| SDK | v6.4.0〜v7.x | **v8（完全書き換え）** | 🔴 高 |
| ネットワーク | datil-dev / datil-test / datil | naga | 🔴 高 |
| 支払い | Capacity Credits | **使用量ベース課金** | 🟡 中 |
| 署名 | ECDSA | ECDSA + **EdDSA（新規）** | 🟢 低 |
| ECDSA性能 | baseline | **2.5倍向上** | 🟢 プラス |
| セッション管理 | 旧API | 簡素化された新API | 🟡 中 |
| パッケージ | `@lit-protocol/*` | **`lit-sdk`（新パッケージ名）** | 🔴 高 |
| バンドルサイズ | 大 | **大幅縮小（モジュラー設計）** | 🟢 プラス |
| 追加機能 | — | Vincent（AI エージェントウォレット委任）、Wrapped Keys | 🟢 参考 |

_Source: [SDK v7 Release](https://spark.litprotocol.com/lit-sdk-v7/), [Naga Test Announcement](https://spark.litprotocol.com/naga-test/), [Naga v8 Interactive Docs](https://github.com/LIT-Protocol/naga-v8-interactive-docs)_

#### ⚠️ 暗号化データ移行の制約

**各Litネットワークは独自のDKG（分散鍵生成）を実行するため、BLSルートキーが異なる。** あるネットワークで暗号化されたデータは、別のネットワークでは復号化できない。

**移行手順：**
1. Datilネットワークで既存暗号化データを復号化
2. Nagaネットワークで再暗号化

これは既存のIrys上の暗号化ファイルすべてに影響する。[High Confidence]

_Source: [Migrating to Datil](https://developer.litprotocol.com/connecting-to-a-lit-network/migrating-to-datil)_

#### 既存実装との差異分析

| 項目 | 既存実装 (`src/lib/lit.ts`) | Naga (V1) 推奨 | 対応要否 |
|---|---|---|---|
| SDK | `@lit-protocol/lit-node-client` v7.3.1 | `lit-sdk` v8 | 🔴 移行必須 |
| ネットワーク | `datil-dev` | `naga` | 🔴 移行必須 |
| 認証 | SIWE → AuthSig | セッション管理の簡素化 | 🟡 要更新 |
| 暗号化API | `encryptFile()` / `decryptToUint8Array()` | 新API（概念は同等） | 🟡 要確認 |
| ACC | `accessControlConditions` | 同等（Unified ACCも対応） | 🟢 互換 |
| チェーン | `polygonAmoy` | 引き続きサポート | 🟢 互換 |

---

### 3. Livepeer — 分散型ビデオインフラストラクチャ

#### アーキテクチャ概要

LivepeerはEthereum上に構築された分散型ビデオインフラストラクチャプロトコルで、AWSなどの集中型サービスをP2Pネットワークによるトランスコーディングで置き換える。[High Confidence]

**ネットワーク構成：**
- **Gateway ノード** — アプリからのビデオ処理ジョブを受信し、Orchestratorへルーティング
- **Orchestrator ノード** — トランスコーディング実行。チケットベース支払いシステム
- **グローバルプール** — 数千のノードオペレータがコンピュートリソースを提供

**主要機能：**
- ライブストリーミング（WebRTC + HLS、500msエンドツーエンド遅延）
- ビデオオンデマンド（トランスコーディング + アダプティブビットレート）
- AI統合（リアルタイムAIビデオパイプライン「Cascade」）
- 100K同時視聴者/ストリーム
- AV1コーデックサポート
- rebufferレート 90パーセンタイル 0.5%

_Source: [Livepeer Docs](https://docs.livepeer.org/), [Livepeer Studio](https://livepeer.studio/), [Livepeer Network](https://www.livepeer.org/network)_

#### SDK & API構成

**既存実装：** `livepeer` パッケージ v3.5.0（約1年前にpublish）

**主要API：**
- `POST /transcode` — 非同期トランスコーディング（S3互換ストレージ入出力）
- ライブストリームAPI — RTMP/WebRTC/HLS
- アセットAPI — ビデオアップロード・管理
- 再生API — プレイバックURL取得

**Transcode APIフロー：**
1. 入力ストレージ設定（HTTP or S3互換）
2. 出力ストレージ設定（S3互換）
3. トランスコーディングプロファイル指定（解像度、ビットレート、fps）
4. HLS/MP4出力
5. タスクIDによる非同期ステータスポーリング

_Source: [Livepeer Transcode API](https://docs.livepeer.org/api-reference/transcode/create), [Livepeer npm](https://www.npmjs.com/package/livepeer)_

#### 2026ロードマップ

| マイルストーン | 予定日 | 内容 |
|---|---|---|
| Crypto支払い簡素化 & ローカルGateway SDK | 2026年2月1日 | 統合の摩擦低減 |
| 改良Gateway製品 | 2026年5月31日 | トランスコーディング統合の強化 |
| エコシステム成長 & コアプロトコルR&D | 2026年6月30日 | リアルタイムビデオAI需要のスケーリング |

**最近のアップグレード：**
- RTMP/FFmpegライブストリームサポート
- ジョブスコアリングアルゴリズムの改善
- MediaMTX統合（マルチURI管理）
- 「Cascade」によるリアルタイムAIビデオパイプライン

_Source: [CoinMarketCap Livepeer Updates](https://coinmarketcap.com/cmc-ai/livepeer/latest-updates/)_

#### 既存実装との差異分析

| 項目 | 既存実装 | 最新推奨 | 対応要否 |
|---|---|---|---|
| SDK | `livepeer` v3.5.0 | 同左（最新） | ✅ 対応済み |
| ストリーミング | HLS（`hls.js` v1.6.15） | WebRTC + HLS | ⚠️ 拡張可能 |
| AI機能 | 未使用 | Cascade（リアルタイムAI） | 🟢 将来検討 |
| Gateway SDK | — | 2026年2月にローカルGateway SDK | ⚠️ 要監視 |
| ストレージ統合 | Irys永続化 | S3互換 + 分散型ストレージ | 🟢 Irys統合は独自設計 |

---

### 技術採用動向

#### Web3ビデオプラットフォームにおけるトレンド

1. **モジュラーSDK設計** — Irys・Litともにモノリシック→モジュラーへ移行。バンドルサイズ削減と依存関係最適化
2. **EVM互換性の強化** — Irys IrysVM、Lit Naga EdDSAともにクロスチェーン・マルチエコシステム対応を重視
3. **AI統合** — Livepeer Cascade、Lit Vincent、Irys AIワークフローと三者ともにAI機能を拡張中
4. **使用量ベース課金** — Lit Protocol がCapacity Credits→使用量課金に移行。コスト予測性向上
5. **パフォーマンス競争** — Lit Naga 2.5倍、Irys 6,000倍（vs Filecoin）等、各プロトコルが性能改善を加速

---

## Integration Patterns Analysis

### 既存実装の統合アーキテクチャ

irys-pocは既に3プロトコルの高度な統合を実現している。以下にデータフローと統合パターンを分析する。

#### 現行アップロードパイプライン

```
[ユーザー] → [VideoUploader.tsx]
    ↓
[1. Livepeer TUS Upload] — src/lib/livepeer.ts
    ↓ (TUS resumable protocol)
[2. Livepeer Transcoding] — 5秒ポーリングで完了待ち
    ↓ (HLS manifest + segments)
[3. HLS Download] — マスターマニフェスト + 全品質バリアント取得
    ↓
[4. Lit Encryption] — src/lib/encryption.ts + src/lib/lit.ts
    ↓ (各セグメントをACC付きで暗号化)
[5. Irys Storage] — src/lib/irys.ts
    ↓ (暗号化セグメント + メタデータをタグ付きアップロード)
[6. Transaction ID返却] — Video ID として利用
```

#### 現行再生パイプライン

```
[視聴者] → [watch/[videoId]/page.tsx]
    ↓
[1. Irys GraphQL Query] — メタデータ取得（タグベースフィルタ）
    ↓
[2. ウォレット接続] — 非公開動画はウォレット必須
    ↓
[3. HLS.js Custom Loader] — src/components/video/VideoPlayer.tsx
    ↓ (セグメント要求ごとに)
[4. Irys Fetch] — 暗号化セグメントダウンロード
    ↓
[5. Lit Decrypt] — ACC検証 + 復号化
    ↓
[6. HLS再生] — 品質選択対応
```

_Source: ソースコード分析 — `src/lib/video.ts`, `src/lib/livepeer.ts`, `src/lib/encryption.ts`, `src/components/video/VideoPlayer.tsx`_

---

### API設計パターン

#### Livepeer Studio API統合

| API | メソッド | 用途 | 既存実装状況 |
|---|---|---|---|
| Asset Upload | `POST /asset/upload` | TUS URLの取得 | ✅ 実装済み |
| Asset Status | `GET /asset/{id}` | トランスコーディング状態ポーリング | ✅ 実装済み |
| Transcode | `POST /transcode` | ファイルトランスコーディング | ⚠️ 直接アセットAPIを使用 |
| Playback Policy | Webhook型 | アクセス制御 | ❌ 未使用（Lit側で代替） |
| Webhook Events | `asset.ready` 等 | 非同期イベント通知 | ❌ ポーリングで代替 |
| Access Control VOD | JWT + Webhook | ネイティブアクセス制御 | ❌ 未使用（Lit側で代替） |

**分析：** 既存実装はLivepeerのネイティブWebhook/アクセス制御を使わず、Lit Protocolで独自のアクセス制御を実現。これは**より強力な暗号学的保証**を提供するが、全セグメントをダウンロード・暗号化・再アップロードする**追加コスト**が発生する。[High Confidence]

_Source: [Livepeer Asset Upload](https://docs.livepeer.org/api-reference/asset/upload), [Livepeer Webhooks](https://docs.livepeer.org/guides/developing/listen-for-webhooks), [VOD Access Control](https://docs.livepeer.org/guides/developing/access-control-vod)_

#### Livepeer公式 × Lit統合パターン（代替アプローチ）

Livepeer公式ドキュメントに**トークンゲーティング統合ガイド**が存在する。このパターンは既存実装と異なるアプローチ：

| 項目 | 公式パターン（Webhook型） | 既存実装（暗号化型） |
|---|---|---|
| アクセス制御の場所 | Livepeer Playback Policy + Webhook | Lit Protocol ACC + 暗号化 |
| ビデオデータ | Livepeer CDNに平文保存 | Irysに暗号化保存 |
| セキュリティモデル | Webhook応答でアクセス許可/拒否 | 暗号学的保証（復号鍵なしでは閲覧不可） |
| ストレージコスト | Livepeer CDNのみ | Livepeer + Irys（二重） |
| 再生遅延 | 低（CDN直接配信） | 中〜高（復号処理あり） |
| 永続性 | Livepeer依存（中央集権） | Irys永続ストレージ（分散型） |
| 検閲耐性 | 低（CDN制御可能） | 高（暗号化 + 分散ストレージ） |

**結論：** 既存実装の暗号化型アプローチは**セキュリティ・永続性・検閲耐性で優位**だが、**コストと再生パフォーマンスでトレードオフ**がある。プロジェクトのミッション（クリエイター/視聴者体験の純粋な向上）を考慮すると、暗号化型が適切。[High Confidence]

_Source: [Livepeer Token Gate with Lit Tutorial](https://docs.livepeer.org/developers/tutorials/token-gate-videos-with-lit), [Lit Protocol Encryption](https://developer.litprotocol.com/sdk/access-control/encryption)_

#### Irys GraphQL統合

**既存実装：**
```typescript
// src/lib/irys.ts — 直接GraphQLクエリ
const response = await fetch("https://uploader.irys.xyz/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
```

**推奨改善パターン：**
- `@irys/query` パッケージの利用 — チェーン可能なクエリビルダー（`.tags()`, `.fromTimestamp()`, `.sort()`, `.limit()`）
- メインネット: `https://arweave.mainnet.irys.xyz/graphql`
- デフォルトリミット1000件
- ページネーション用 `cursor` サポート

| 項目 | 既存実装 | 推奨 | 対応要否 |
|---|---|---|---|
| クエリ方法 | 生GraphQL文字列 | `@irys/query` パッケージ | ⚠️ 改善推奨 |
| エンドポイント | `uploader.irys.xyz/graphql` | `arweave.mainnet.irys.xyz/graphql` | ⚠️ 要確認 |
| ページネーション | なし（first: 20固定） | cursor ベース | ⚠️ 改善推奨 |
| フィルタ | タグベース | タグ + タイムスタンプ + ソート | 🟢 拡張可能 |

_Source: [Irys Query Package](https://github.com/Irys-xyz/query), [Irys Tags API](https://arweave-tools.irys.xyz/querying/api/tags)_

---

### 通信プロトコル

#### TUS (Resumable Upload Protocol)

既存実装で`tus-js-client`（v4.3.1）を使用。Livepeerはresumableアップロードを推奨しており、不安定なネットワーク接続での信頼性が向上する。[High Confidence]

#### HLS (HTTP Live Streaming)

- `hls.js` v1.6.15でクライアントサイド再生
- カスタムローダーによるオンザフライ復号化
- マルチ品質対応（360p, 480p, 720p, 1080p）
- **WebRTC低遅延ストリーミング**はLivepeerがサポートするが、現在未実装

#### SIWE (Sign-In with Ethereum)

- `siwe` v3.0.0でウォレット認証
- Lit Protocol AuthSig生成に使用
- Naga SDK v8ではセッション管理が簡素化される予定

---

### 統合セキュリティパターン

#### 現行アクセス制御フロー

```
[ウォレット接続] → [SIWE署名] → [AuthSig生成]
    ↓
[Lit ACC評価]
    - OR条件: sender OR recipient
    - EVM条件ベース（トークン残高、NFT保有等）
    ↓
[復号鍵の分散取得] — Litノード 2/3 合意必要
    ↓
[セグメント復号化] — クライアントサイド
```

**Naga移行後の変更点：**
- AuthSig → 新セッション管理API
- Capacity Credits → 使用量ベース課金
- BLSルートキーの変更 → 既存暗号化データの再暗号化が必要

_Source: [Lit Protocol ACC](https://developer.litprotocol.com/sdk/access-control/intro), [Lit Encryption Concept](https://developer.litprotocol.com/concepts/access-control-concept)_

---

### 3プロトコル間データフロー図

```
┌─────────────┐     TUS Upload      ┌──────────────┐
│   Client     │ ──────────────────► │   Livepeer   │
│  (Browser)   │                     │   Studio     │
│              │ ◄────── HLS ─────── │   Gateway    │
└──────┬───────┘                     └──────────────┘
       │
       │  Encrypt (ACC)    ┌──────────────┐
       │ ─────────────────►│ Lit Protocol │
       │ ◄── DecryptKey ── │   (Naga)     │
       │                   │  MPC TSS     │
       │                   └──────────────┘
       │
       │  Store/Query      ┌──────────────┐
       │ ─────────────────►│    Irys      │
       │ ◄── GraphQL ───── │  Datachain   │
       │                   │  (永続)      │
       └───────────────────└──────────────┘
```

### 統合パターンの課題と改善機会

| # | 課題 | 影響 | 改善案 |
|---|---|---|---|
| 1 | 全セグメント暗号化のコスト | ストレージ費用増 | 公開動画はLit暗号化をスキップ |
| 2 | オンザフライ復号の再生遅延 | UX | セグメントプリフェッチ + キャッシュ |
| 3 | 生GraphQLクエリ | 保守性 | `@irys/query`パッケージ採用 |
| 4 | ポーリング型ステータス確認 | 効率 | Livepeer Webhook導入 |
| 5 | Lit Datil→Naga移行 | 🔴 緊急 | SDK v8移行 + データ再暗号化 |
| 6 | GraphQLエンドポイント | L1移行リスク | エンドポイント設定の外部化 |

---

## Architectural Patterns and Design

### システムアーキテクチャパターン

#### irys-pocの位置付け：分散型ビデオプラットフォームアーキテクチャ類型

学術・業界の分散型ビデオプラットフォームアーキテクチャと比較すると、irys-pocは以下の独自パターンを採用している：

| アーキテクチャ類型 | 代表例 | irys-pocとの比較 |
|---|---|---|
| **P2Pリレー型** | VidBlock | 直接P2P配信なし。Livepeer Gateway経由 |
| **IPFS + HLS型** | 多数のWeb3プラットフォーム | IPFSではなくIrys永続ストレージ採用 |
| **CDN + Webhook型** | Livepeer Studio公式 | CDN依存を排除。暗号化 + 分散ストレージ |
| **クライアントサイド暗号化型** | IEEE論文提案 | ✅ **最も近い。** Lit MPC + Irys永続化 |

irys-pocの**クライアントサイド暗号化 + 分散永続ストレージ + 分散トランスコーディング**の組み合わせは、学術論文で提案されているパターンの実用的実装と言える。[High Confidence]

_Source: [VidBlock (MDPI)](https://www.mdpi.com/2076-3417/15/3/1289), [Blockchain Streaming Trends 2025](https://trembit.com/blog/blockchain-video-streaming-trends-in-2025/), [IEEE Content Protection](https://ieeexplore.ieee.org/document/9392746/)_

---

### 各プロトコルのアーキテクチャパターン詳細

#### Irys — マルチレジャー + プログラマブルデータパターン

**コアアーキテクチャ：**

```
┌─────────────────────────────────────────┐
│              IrysVM (EVM互換)            │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Smart       │  │ Programmable    │   │
│  │ Contracts   │──│ Data Opcodes    │   │
│  └─────────────┘  └────────┬────────┘   │
│                            │             │
│  ┌─────────────────────────▼──────────┐  │
│  │      Multi-Ledger Storage          │  │
│  │  ┌──────────┐  ┌───────────────┐   │  │
│  │  │ Submit   │→ │ Permanent     │   │  │
│  │  │ Ledger   │  │ Ledger        │   │  │
│  │  │ (Buffer) │  │ (Verified)    │   │  │
│  │  └──────────┘  └───────────────┘   │  │
│  └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**設計パターンとirys-pocへの適用可能性：**

| パターン | 説明 | irys-pocでの活用可能性 |
|---|---|---|
| **Programmable Data** | データにロジックを埋め込みスマートコントラクトが実行 | ⭐ ライセンス・ロイヤリティの自動執行 |
| **Proof of SQL** | SQLクエリのZK証明をオンチェーン検証 | 🟢 動画メタデータの信頼性検証 |
| **自動ロイヤリティ** | IrysVM上のスマートコントラクトがデータ参照時に自動分配 | ⭐ Revenue Split の自動執行 |
| **Matrix Packing** | マイナーアドレスをチャンクに埋め込みリモートマイニング防止 | 🟢 ストレージの信頼性保証 |

**将来設計への示唆：** IrysVMのProgrammable Dataを活用すれば、現在オフチェーンで管理しているRevenue SplitやアクセスコントロールロジックをIrysオンチェーンに移行できる。これにより「コードとデータの同一チェーン」という理想的なアーキテクチャが実現可能。[Medium Confidence — IrysVM成熟度に依存]

_Source: [Irys Whitepaper](https://irys.xyz/assets/IrysWhitepaper.pdf), [IrysVM Developer Guide](https://medium.com/@zizicrypt/exploring-iryss-programmable-datachain-in-the-role-of-the-developer-a-guide-on-programmable-data-5cb56fb1ec6f), [Irys Core Features](https://irys.xyz/core-features)_

#### Lit Protocol — MPC TSS + TEE多層防御パターン

**セキュリティアーキテクチャ：**

```
┌─ Security Layer 1: Network ─────────────────┐
│  分散ノード（2/3合意必要）                   │
│  ┌─ Security Layer 2: Threshold ──────────┐  │
│  │  鍵シェア分散（単一ノードに完全鍵なし） │  │
│  │  ┌─ Security Layer 3: TEE (SGX) ────┐  │  │
│  │  │  ハードウェア保護エンクレーブ内    │  │  │
│  │  │  で暗号化操作を実行              │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│  + 定期的な鍵シェアリフレッシュ              │
│  + ノード変更時のリシェアリング               │
└──────────────────────────────────────────────┘
```

**スケーラビリティ: Shadow Splicing**

従来のMPCシステムの課題 — ネットワーク拡大に伴いノード間通信オーバーヘッドが指数関数的に増大 — をLitは**Shadow Splicing**で解決。ノードオペレータを**Realm（領域）** に分割し、領域間で暗号鍵をセキュアに転送（key branching）。Realmは即座に独立し、分離が保証される。[High Confidence]

**パフォーマンス実績（Datil時点）：**
- 単一復号化: 約200ms（低負荷時）
- 最大並列復号: 600件同時
- 累計ネットワークリクエスト: 24,616,295件
- 月間平均: 794,074リクエスト
- 累計復号リクエスト: 136,541件

**irys-pocへの影響：**
- セグメント単位復号化（現行パターン）は200ms/セグメントの遅延を見込む
- HLSセグメントは通常2〜6秒 → 復号遅延はバッファリングでカバー可能
- ただし同時視聴者数増加時は並列復号制限（600件）に注意

_Source: [Shadow Splicing](https://spark.litprotocol.com/enhancing-threshold-security-and-performance-at-scale-introducing-shadow-splicing/), [MPC Threshold Wallets](https://spark.litprotocol.com/mpc-threshold-wallets-revisited/), [Lit Security](https://developer.litprotocol.com/security/introduction)_

#### Livepeer — Gateway/Orchestrator/Worker分離パターン

**ネットワークアーキテクチャ：**

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ App      │────►│ Gateway Node │────►│ Orchestrator │
│ (irys-   │     │ (Stateless   │     │ Node         │
│  poc)    │     │  Routing)    │     │ (Job Mgmt)   │
└──────────┘     └──────────────┘     └──────┬───────┘
                                             │
                                      ┌──────▼───────┐
                                      │ Worker Node  │
                                      │ (GPU Trans-  │
                                      │  coding/AI)  │
                                      └──────────────┘
```

**設計特徴：**
- **Stateless Gateway** — ルーティングと検証のみ。セッション状態を持たない
- **Pay-per-task** — 事前予約不要。オンデマンド課金（〜$0.02/分 vs AWS $0.21/分）
- **Permissionless Scaling** — Orchestrator/Gateway追加は自由
- **AI Subnet拡張** — トランスコーディングからAI推論への拡張。ネットワーク収益の72%がAI推論由来

**irys-pocでの活用ステータス：**
- ✅ Gateway経由のトランスコーディング（Asset Upload API）
- ✅ TUS resumable upload
- ❌ AI Subnet（Cascade）— 未使用、将来検討
- ❌ ローカルGateway SDK — 2026年2月リリース予定

_Source: [Livepeer Network](https://www.livepeer.org/network), [Livepeer AI](https://docs.livepeer.org/ai/introduction), [Streamflow](https://github.com/livepeer/wiki/blob/master/STREAMFLOW.md), [Livepeer Cascade](https://blog.livepeer.org/a-real-time-update-to-the-livepeer-network-vision/)_

---

### スケーラビリティとパフォーマンスパターン

#### ボトルネック分析

| レイヤー | ボトルネック | 現行影響 | 緩和策 |
|---|---|---|---|
| **Livepeer Transcode** | GPU空き状況によるキュー待ち | 中（分散ネットワークで分散） | Gateway選択アルゴリズム改善（2026ロードマップ） |
| **Lit Decrypt** | 200ms/セグメント + 並列600件上限 | 低（バッファリングでカバー） | Naga 2.5x性能向上、Shadow Splicing |
| **Irys Upload** | 全セグメント暗号化・アップロード | 高（アップロード時間の大部分） | 並列アップロード、公開動画の暗号化スキップ |
| **Irys Query** | GraphQL 20件固定 | 低（現段階） | cursorページネーション、`@irys/query` |
| **HLS再生** | セグメントごとのIrys fetch + Lit decrypt | 中（初回バッファリング遅延） | プリフェッチ、ServiceWorkerキャッシュ |

---

### セキュリティアーキテクチャパターン

#### 多層セキュリティ設計

```
Layer 1: ウォレット認証 (MetaMask + SIWE)
    ↓
Layer 2: アクセス制御 (Lit ACC — EVM条件評価)
    ↓
Layer 3: 暗号化 (Lit BLS — クライアントサイド暗号化)
    ↓
Layer 4: 永続ストレージ (Irys — 暗号化データのみ保存)
    ↓
Layer 5: ネットワーク検証 (Lit 2/3ノード合意 + TEE)
```

**セキュリティ強度評価：** 現行設計は学術論文で提案されるレベルの多層防御を実現。クライアントサイド暗号化 → 分散鍵管理 → 永続ストレージの組み合わせにより、プラットフォーム運営者でさえ暗号化データにアクセス不可。[High Confidence]

---

### データアーキテクチャパターン

#### Irysタグベースメタデータ設計

現行設計はIrysのタグシステムをメタデータストアとして活用：

```
Transaction Tags:
  App-Name: "SecureFileSharePoC"
  Recipient: "0x..."
  Content-Type: "video/..."
  Category: "..."
  Access-Type: "public|token-gated|subscription"
```

**評価：**
- ✅ スキーマレスで柔軟
- ✅ GraphQLによるフィルタリング
- ⚠️ 複雑なリレーションシップ表現は困難
- ⚠️ 全文検索未サポート
- 💡 IrysVM Programmable Dataで将来的にリッチなデータモデルが可能

---

### 将来アーキテクチャへの提言

| 優先度 | 提言 | 根拠 |
|---|---|---|
| 🔴 P0 | **Lit Naga移行** | 2/25シャットダウン。SDK v8 + 暗号化データ再処理 |
| 🟡 P1 | **IrysVMプログラマブルデータ活用** | ロイヤリティ自動執行、オンチェーンライセンス管理 |
| 🟡 P1 | **Livepeer Webhook導入** | ポーリング→イベント駆動への改善 |
| 🟢 P2 | **`@irys/query`パッケージ採用** | クエリ保守性・ページネーション改善 |
| 🟢 P2 | **セグメントプリフェッチ** | 再生遅延のUX改善 |
| 🟢 P3 | **Livepeer AI Subnet検討** | コンテンツモデレーション、自動サムネイル等 |
| 🟢 P3 | **P2P Media Loader検討** | CDN依存の更なる削減、HLS P2P配信 |

---

## Implementation Approaches and Technology Adoption

### 技術移行戦略

#### P0: Lit Protocol Datil → Naga移行（期限: 2026年2月25日）

**移行ステップ：**

| # | ステップ | 詳細 | リスク |
|---|---|---|---|
| 1 | SDK v8パッケージインストール | `@lit-protocol/lit-node-client` v8.0.2 + 関連パッケージ。または新 `lit-sdk` パッケージ | 低 |
| 2 | ネットワーク設定変更 | `datil-dev` → `naga`（devnet or mainnet） | 低 |
| 3 | API変更対応 | `encryptFile()` / `decryptToUint8Array()` → v8新API。インポートパス変更 | 中 |
| 4 | 認証フロー更新 | AuthSig → 新セッション管理API。SIWE連携の調整 | 中 |
| 5 | 課金モデル対応 | Capacity Credits → 使用量ベース課金 | 低 |
| 6 | 暗号化データ再処理 | 既存Datil暗号化データを復号→Nagaで再暗号化→Irysに再アップロード | 🔴 高 |

**重要な制約：** DKGが異なるため、Datilで暗号化されたデータはNagaでは復号不可。移行期間中は両ネットワークが並行稼働するため、段階的移行が可能。[High Confidence]

**実装参考リソース：**
- [Lit Naga v8 Interactive Docs](https://github.com/LIT-Protocol/naga-v8-interactive-docs)
- [Lit Naga Changelog](https://naga.developer.litprotocol.com/changelog)
- `@lit-protocol/crypto` v8.0.2（npm最新）

_Source: [Lit SDK Installation](https://developer.litprotocol.com/sdk/installation), [Lit Encryption](https://developer.litprotocol.com/sdk/access-control/encryption), [Naga v8 GitHub](https://github.com/LIT-Protocol/naga-v8-interactive-docs)_

#### P1: Livepeer Webhook導入

**実装パターン（Next.js App Router）：**

```
src/app/api/livepeer-webhook/route.ts  ← 新規作成
```

**セットアップ手順：**

1. Next.js API Route作成（`POST /api/livepeer-webhook`）
2. Livepeer Studio Dashboard → Developers → Webhooks → webhook登録
3. `asset.created`, `asset.ready`, `asset.failed` イベントを選択
4. `Livepeer-Signature` ヘッダーによる署名検証を実装
5. ローカル開発では ngrok でトンネル公開

**メリット：**
- 5秒ポーリングを排除 → リアルタイムイベント通知
- トランスコーディング完了の即時検知
- サーバー負荷削減

_Source: [Livepeer Webhook Setup](https://docs.livepeer.org/developers/guides/setup-and-listen-to-webhooks), [Livepeer Asset Events](https://docs.livepeer.org/developers/guides/listen-to-asset-events)_

#### P2: Irys Query改善

**現行 → 推奨の変更：**

```typescript
// 現行: 生GraphQL文字列
const query = `query { transactions(tags: [...]) { edges { node { id } } } }`;
const response = await fetch("https://uploader.irys.xyz/graphql", { ... });

// 推奨: @irys/query パッケージ
import Query from "@irys/query";
const myQuery = new Query({ network: "mainnet" });
const results = await myQuery
  .search("irys:transactions")
  .tags([{ name: "App-Name", values: ["SecureFileSharePoC"] }])
  .sort("DESC")
  .limit(20);
```

**メリット：** タイプセーフ、cursorページネーション、チェーン可能クエリ

_Source: [Irys Query Package](https://github.com/Irys-xyz/query), [Irys Tags API](https://arweave-tools.irys.xyz/querying/api/tags)_

#### P2: HLS再生パフォーマンス最適化

**セグメントプリフェッチ戦略：**

| 戦略 | 説明 | 効果 |
|---|---|---|
| **マルチセグメントプリフェッチ** | hls.jsのバッファ設定で先読みセグメント数を増やす | バッファリング削減 |
| **Web Crypto API** | `crypto.subtle.decrypt()` でAES復号化をネイティブ実行 | 復号速度向上 |
| **Web Worker復号化** | 復号処理をメインスレッドから分離 | UI応答性向上 |
| **キャッシュ戦略** | 復号済みセグメントのメモリキャッシュ | シーク時の再復号回避 |

**注意：** Service Workerによるfetchインターセプト＋復号化は技術的に可能だが、広く文書化されたパターンではない。hls.jsカスタムローダーでの対応（現行パターン）が実績あり。[Medium Confidence]

_Source: [hls.js Prefetch Issue](https://github.com/video-dev/hls.js/issues/6753), [HLS.js Guide](https://www.videosdk.live/developer-hub/hls/hls-js)_

---

### テスト戦略

| テスト種別 | 対象 | ツール | 優先度 |
|---|---|---|---|
| **Unit** | Lit暗号化/復号化ラッパー | Jest/Vitest + モック | 🔴 P0（Naga移行検証） |
| **Integration** | Livepeer Upload → Transcode → Callback | テスト環境 + ngrok | 🟡 P1 |
| **E2E** | アップロード→視聴の全フロー | Playwright | 🟡 P1 |
| **Performance** | セグメント復号遅延、バッファリング | Lighthouse + カスタムメトリクス | 🟢 P2 |
| **Contract** | Irys GraphQL応答スキーマ | Pact / スキーマ検証 | 🟢 P2 |

---

### コスト最適化

| コスト項目 | 現行推定 | 最適化案 | 削減見込み |
|---|---|---|---|
| **Livepeer Transcoding** | 〜$0.02/分 | 変更不要（既に安価） | — |
| **Irys Storage** | 〜$0.05/GB永続 | 公開動画のLit暗号化スキップ | セグメント暗号化コスト削減 |
| **Lit Decryption** | 使用量ベース（Naga） | セッション再利用、復号結果キャッシュ | 復号リクエスト数削減 |
| **Irys Upload** | セグメント数 × 単価 | HLSバリアント数の最適化（2-3品質） | アップロード量削減 |

---

### リスク評価と緩和策

| # | リスク | 確率 | 影響 | 緩和策 |
|---|---|---|---|---|
| 1 | **Lit Datilシャットダウンに間に合わない** | 中 | 🔴 致命的 | 即時着手。並行稼働期間を活用 |
| 2 | **SDK v8の不安定性・ドキュメント不足** | 中 | 🟡 高 | Naga Interactive Docsとchangelogを参照。コミュニティ・Discordで情報収集 |
| 3 | **Irys L1移行でGraphQLエンドポイント変更** | 低 | 🟡 中 | エンドポイントを環境変数化。既存バンドラは当面利用可能 |
| 4 | **Livepeer Gateway SDK変更** | 低 | 🟢 低 | 2026年2月リリース。段階的採用 |
| 5 | **暗号化データ再処理のデータ消失** | 低 | 🔴 致命的 | 移行前にバックアップ。段階的処理 |

---

## Technical Research Recommendations

### 実装ロードマップ

```
Phase 1（即時 〜 2/25）: Lit Naga移行
├── SDK v8インストール・API変更対応
├── ネットワーク設定変更（datil-dev → naga）
├── 暗号化/復号化テスト
└── 既存データの再暗号化計画策定

Phase 2（3月）: 統合改善
├── Livepeer Webhook導入
├── @irys/query パッケージ採用
├── GraphQLエンドポイント環境変数化
└── テストスイート整備

Phase 3（4月〜）: パフォーマンス・拡張
├── セグメントプリフェッチ最適化
├── 公開動画の暗号化スキップ
├── IrysVM Programmable Data調査
└── Livepeer AI Subnet検討
```

### 技術スタック推奨更新

| パッケージ | 現行 | 推奨 | 理由 |
|---|---|---|---|
| `@lit-protocol/*` | v7.3.1 | **v8.0.2+** (lit-sdk) | 🔴 Datilシャットダウン対応 |
| `@irys/query` | 未使用 | **新規追加** | クエリ保守性・ページネーション |
| `livepeer` | v3.5.0 | v3.5.0（維持） | 最新安定版 |
| `@irys/web-upload` | v0.0.15 | v0.0.15（維持） | 最新推奨パターン準拠 |
| `viem` | v2.41.2 | v2.41.2（維持） | Irys/Lit両方で利用 |

### 成功指標

| KPI | 現行ベースライン | 目標 |
|---|---|---|
| Lit SDK バージョン | v7.3.1 (Datil) | v8.x (Naga) |
| トランスコード完了検知 | 5秒ポーリング | Webhookイベント（<1秒） |
| 初回再生バッファリング | 未計測 | <3秒 |
| アップロード完了時間 | 未計測 | ベースライン設定後10%改善 |
| テストカバレッジ | 0% | >60%（暗号化/復号化ラッパー） |
