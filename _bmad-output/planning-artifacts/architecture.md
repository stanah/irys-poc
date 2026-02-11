---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-02-12'
lastStep: 8
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/product-brief-irys-poc-2026-02-02.md'
  - '_bmad-output/planning-artifacts/research/market-decentralized-video-monetization-research-2026-02-01.md'
  - '_bmad-output/planning-artifacts/research/technical-irys-livepeer-lit-architecture-research-2026-02-02.md'
  - 'docs/index.md'
  - 'docs/project-overview.md'
  - 'docs/architecture.md'
  - 'docs/source-tree-analysis.md'
  - 'docs/development-guide.md'
  - 'docs/component-inventory.md'
  - 'docs/api-contracts.md'
  - 'docs/research/livepeer-theta-comparison.md'
workflowType: 'architecture'
project_name: 'irys-poc'
user_name: 'stanah'
date: '2026-02-12'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

38件のFRが7カテゴリに分類される。アーキテクチャに最も大きな影響を与えるのは以下の3領域：

1. **動画管理 (FR7-FR16)** — Livepeer TUSアップロード → トランスコード → Lit暗号化 → Irys保存の直列パイプライン。各段階の進捗管理、エラーハンドリング、残高チェック（Irys）が必要。クリエイターが自分のIrys残高をデポジット・管理する機能（FR16）が前提
2. **動画再生 (FR17-FR20)** — 公開動画はIrys Gateway→HLS直接再生。限定動画はACC検証→Lit復号→HLS再生。hls.jsカスタムローダーによるプログレッシブ復号（セグメント単位で復号→即再生開始）が中核技術。NFR-P2の「3秒以内」制約がパフォーマンス設計を規定
3. **コンテンツアクセス制御 (FR27-FR30)** — Lit Protocol ACCによる暗号学的アクセス制御。条件未充足時のロック画面、条件充足時の自動アクセス許可、送信者/受信者双方の復号権限。OR条件パターンがアクセス制御の基本構造

**Non-Functional Requirements:**

| 領域 | 件数 | アーキテクチャへの影響 |
|------|------|---------------------|
| Performance (NFR-P1〜P5) | 5 | 公開動画1秒/限定動画3秒の再生開始制約がキャッシュ・プリフェッチ戦略を規定。投げ銭確認時間・アップロード完了時間は**計測・記録が必須**（コスト計測インストルメンテーション設計に直結） |
| Security (NFR-S1〜S6) | 6 | クライアントサイド完結の暗号化モデルを強制。秘密鍵・セッション署名のサーバー非保存。NEXT_PUBLIC_プレフィックス管理 |
| Integration (NFR-I1〜I6) | 6 | SDKバージョン固定、プロトコル別タイムアウト（Lit:60s, Livepeer:30s, Irys:15s）、障害分離設計（Lit障害時も公開動画は視聴可能） |
| Reliability (NFR-R1〜R3) | 3 | 単一プロトコル障害時のグレースフルデグラデーション、トランザクション状態の明示、E2Eテスト |

**Scale & Complexity:**

- Primary domain: blockchain_web3 + web_app（フルスタック分散型）
- Complexity level: 高
- Estimated architectural components: 15-20（サービス層5、コンポーネント層10+、コントラクト層1-2）

### Technical Constraints & Dependencies

| 制約 | 影響 | 対応方針 |
|------|------|---------|
| **Lit Protocol Naga移行（2/25期限）** | SDK v7→v8完全書き換え。DKG差異によりDatil暗号化データはNagaで復号不可 | 最優先。既存暗号化データの再処理が必要 |
| **Naga移行失敗時の代替方針** | 期限超過またはSDK v8不安定の場合、全限定動画機能がブロックされる | DatilDevでの暫定運用を検討。公開動画パイプライン（Lit非依存）を先行安定化し、限定動画はNaga安定後に統合 |
| **クライアントサイド完結** | サーバーサイドに鍵・セッション情報を保存不可。処理の大部分がブラウザ上 | Next.js API Routeは最小限（GraphQLプロキシのみ）。ブラウザメモリ制約に注意（大容量動画のセグメント順次処理設計が必須）。Lit復号（200ms/セグメント）等のCPU集約処理はWeb Worker切り出しを検討 |
| **Polygon Amoy（テストネット）** | 本番チェーン選定はPoC後。ガスコスト・確定速度の計測がPoC目的 | 環境変数でチェーン設定を外部化 |
| **Webpack必須** | Turbopack未サポート（Lit Protocol等のNode.jsモジュールfallback必要） | next build --webpack。Turbopack対応は各SDK成熟後 |
| **ソロ開発者** | バス係数1。ドキュメント・テスト整備が持続可能性の鍵 | アーキテクチャ文書の充実、E2Eテスト優先 |

**PoC段階で意図的に除外するもの（スコープ制約）:**

| 除外項目 | 理由 | データ構造への影響 |
|---------|------|-------------------|
| HLSアダプティブビットレート品質選択UI | コア検証に不要 | ただしデータ構造はマルチ品質前提で設計（将来追加容易に） |
| リアルタイムPush通知（WebSocket/SSE） | P1スコープ | ページ内通知のみ。通知基盤の抽象化は不要 |
| CI/CD自動化 | P1スコープ | ローカルテスト実行のみ |
| Revenue Split UI | Phase 2 | コントラクトは設計済み（VideoTipping.sol）だがUI未実装 |

### Cross-Cutting Concerns Identified

1. **認証・ウォレット管理** — AA（Alchemy Account Kit）とMetaMask直接接続の二重パス。全コンポーネントがウォレット状態に依存。WalletContext + useWalletが横断。FR3「3ステップ以内」制約は両認証パスに等しく適用される
2. **プロトコル抽象化層（Adapter/Facade）** — Lit/Livepeer/Irys各SDKへの直接依存を制御する抽象化レイヤーの設計方針。Lit Naga移行が示すようにSDK APIは変更される。変更影響範囲をサービス層に封じ込め、コンポーネント層への伝播を防ぐ設計が必要
3. **エラーハンドリング・障害分離・統一エラーマッピング** — 3外部プロトコルそれぞれの障害モードが異なる。NFR-I5「ユーザーに理解可能な形で表示」が横断要件。各プロトコル固有のエラーを、ユーザー向けの統一メッセージ体系にマッピングする層が必要
4. **パイプライン独立性** — 公開動画パイプライン（Livepeer + Irys）と限定動画パイプライン（Livepeer + Lit + Irys）の分離度がアーキテクチャの核心。NFR-I2（Lit障害→公開動画無影響）、NFR-I6（Livepeer障害→既存動画再生可能）を実現するには、各パイプラインが独立して動作する設計が必須
5. **コスト計測インストルメンテーション** — 各プロトコルとのインタラクションごとにコストデータを計測・永続化する仕組み。NFR-P4（投げ銭確認時間）、NFR-P5（アップロード完了時間）、FR36（プロトコル実効コスト記録）。PoC成功判定に直結するため、パイプライン全体にコスト計測ポイントを埋め込むインストルメンテーション設計が必要
6. **暗号化/復号ライフサイクル** — アップロード（暗号化）と再生（復号）の両パイプラインに跨る。プログレッシブ復号（最初のセグメント復号完了→即再生開始）がVideoPlayerアーキテクチャの前提。Lit Naga移行でAPI変更の影響を受ける
7. **プロトコルバージョン管理** — SDKバージョン固定（NFR-I1）と、Lit Naga/Irys L1移行等の破壊的変更への対応。抽象化層（上記#2）と組み合わせてバージョン移行の影響を制御

## Starter Template Evaluation

### Primary Technology Domain

blockchain_web3 + web_app（フルスタック分散型） — 既存のNext.js 16 App Router + 分散型プロトコル統合アーキテクチャを継続

### Project Type: Brownfield

本プロジェクトは既に動作する実装を持つブラウンフィールドプロジェクトである。新規スターターテンプレートの採用ではなく、既存技術スタックの検証・アップデート・補完を行う。

### 既存技術スタック検証

| パッケージ | 現行バージョン | 最新安定版 | 対応 |
|-----------|-------------|-----------|------|
| Next.js | 16.0.8 | 16.1.6 LTS | 🔴 アップデート必須（CVE-2025-66478: RSCデシリアライゼーションRCE, CVSS 10.0） |
| React | 19.2.1 | 19.x | ✅ 最新 |
| TypeScript | ^5 | ^5 | ✅ 最新 |
| TailwindCSS | ^4 | 4.1.x | ✅ 最新（^4でカバー） |
| Viem | ^2.41.2 | ^2.x | ✅ 最新安定 |
| Livepeer SDK | ^3.5.0 | ^3.5.0 | ✅ 最新安定 |
| @irys/web-upload | ^0.0.15 | 0.0.15 | ✅ 最新 |
| @irys/web-upload-ethereum-viem-v2 | ^0.0.17 | 0.0.17 | ✅ 最新 |
| hls.js | ^1.6.15 | ^1.6.x | ✅ 最新安定 |
| tus-js-client | ^4.3.1 | ^4.x | ✅ 最新安定 |
| siwe | ^3.0.0 | ^3.x | ✅ 最新安定 |
| Zod | ^4.1.13 | ^4.x | ✅ 最新安定（標準バリデーションライブラリとして採用） |
| @tanstack/react-query | ^5.90.12 | ^5.x | ✅ 最新安定（現行維持、P1で活用方針を判断） |
| @lit-protocol/* | ^7.3.1 | **v8.x (Naga)** | 🔴 移行必須（2/25期限） |

**セキュリティアップデート詳細:**
- **CVE-2025-66478** (CVSS 10.0) — React Server Components "Flight" プロトコルの非安全なデシリアライゼーション。未認証RCE。`create-next-app`直後のアプリも脆弱
- **CVE-2025-55184** (High) — DoS脆弱性
- **CVE-2025-55183** (Medium) — ソースコード露出
- Next.js 16.1.6 LTSにすべての修正が含まれる。アップデート後にアプリケーションシークレットのローテーションを推奨

### 追加パッケージ選定

| パッケージ | バージョン | 用途 | MVPスコープ |
|-----------|-----------|------|-----------|
| **vitest** | ^4.0.18 | ユニットテスト | 🔴 P0 |
| **@playwright/test** | ^1.58.2 | E2Eテスト | 🔴 P0 |
| **@irys/query** | latest | Irys GraphQLクエリビルダー | 📋 P1（MVPでは現行生GraphQLを維持） |

### Lit Protocol Naga移行パッケージ

| 現行パッケージ | 移行先 | 影響ファイル |
|-------------|--------|------------|
| @lit-protocol/lit-node-client ^7.3.1 | ^8.x (Naga) | `src/lib/lit.ts` |
| @lit-protocol/encryption ^7.3.1 | ^8.x | `src/lib/encryption.ts` |
| @lit-protocol/constants ^7.3.1 | ^8.x | `src/lib/lit.ts` |
| @lit-protocol/types ^7.3.1 | ^8.x | `src/lib/lit.ts`, `src/lib/encryption.ts` |

SDK v8ではサブパスエクスポートが変更（`naga`, `naga-production`, `naga-test`等のネットワーク別エントリポイント）。Cross-Cutting Concern #2（プロトコル抽象化層）により、影響は`src/lib/lit.ts`と`src/lib/encryption.ts`の2ファイルに封じ込められる設計とする。

### Architectural Decisions Provided by Existing Stack

**Language & Runtime:**
- TypeScript strict mode + Next.js 16 App Router
- Node.js v24 (mise管理)、pnpm 10.25.0

**Styling Solution:**
- TailwindCSS 4（CSS-first config、ゼロコンフィグ）

**Build Tooling:**
- Webpack（Turbopack未対応 — Lit Protocol等のNode.jsモジュールfallback必要）
- `next build --webpack` フラグ

**Testing Framework（新規追加）:**
- Vitest 4.x — ユニット/統合テスト
- Playwright 1.58.x — E2Eテスト
- 注意: Vitest + Next.jsでは`vitest.config.ts`の`resolve.alias`を`tsconfig.json`の`@/*` → `./src/*`パスエイリアスと同期させること

**Validation:**
- Zod 4.x — スキーマバリデーション標準ライブラリ

**Code Organization:**
- App Router規約（`src/app/` ルーティング）
- サービス層（`src/lib/`）— プロトコル統合ロジック
- カスタムフック（`src/hooks/`）— React状態管理
- コンポーネント（`src/components/`）— UIレイヤー
- 型定義（`src/types/`）— 共有型

**State Management:**
- React Context（WalletContext）+ Custom Hooks
- @tanstack/react-query（サーバーステート） — 現行維持、P1で活用方針を判断

**Deployment:**
- Vercel（Next.js標準デプロイ先）

**Smart Contract Tooling:**
- Foundry (Solidity 0.8.20) + OpenZeppelin
- Polygon Amoyテストネット
- Foundryバージョンも`foundry.toml`で固定し再現可能ビルドを保証

### テスト戦略概要

**テストスコープ・優先順位:**

| テストレベル | ツール | MVPスコープ | 対象 |
|------------|--------|-----------|------|
| Unit | Vitest | 🔴 P0（Naga移行検証） | Lit暗号化/復号ラッパー、ACC生成関数、エラーマッピング |
| Integration | Vitest | 📋 P1 | サービス層の結合テスト |
| E2E | Playwright | 🔴 P0 | 公開動画、限定動画、投げ銭、AAフローの4パイプライン |

**テストのモック境界:**

| モックする（テスト安定性優先） | 実際に叩く（統合検証） |
|------------------------------|---------------------|
| MetaMask署名 | Irys GraphQL（テストネット） |
| Litノードレスポンス | スマートコントラクト（Polygon Amoy） |
| Livepeer Studio API | — |

**テストデータ分離:**
- テスト用タグプレフィックス（例: `App-Name: "DecentralizedVideo-Test"`）でIrys上の本番データとテストデータを分離

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions（実装ブロッカー）:**
- サービス層抽象化（Interface + DI） — 全サービス実装の前提
- Context-based DI + ServiceProvider — コンポーネント-サービス間の接続方式
- useReducer + usePipelineOrchestrator — アップロードパイプラインの中核設計
- 環境変数Zodスキーマ — 全サービス初期化の前提

**Important Decisions（アーキテクチャ形成）:**
- AA/MetaMask統合パターン（統一Walletインターフェース）
- Result型エラーハンドリング
- react-queryの役割分担（読み取り系クエリに集中）

**Deferred Decisions（PoC後）:**
- ログ集約基盤（Datadog等） — PoC段階ではconsole.logで十分
- CI/CDパイプライン — P1スコープ
- CDN/エッジキャッシュ戦略 — 本番化時に検討

### Category 1: Data Architecture

| 決定 | 選択 | 根拠 |
|------|------|------|
| **クライアントサイドキャッシュ** | @tanstack/react-queryのキャッシュのみ（`staleTime`設定） | PoC段階でシンプル。既存依存を活用 |
| **コスト計測データ永続化** | ブラウザコンソールログ + 手動記録 | 最小実装。PoC成功判定にはログ確認で十分 |

### Category 2: Authentication & Security

| 決定 | 選択 | 根拠 |
|------|------|------|
| **AA/MetaMask統合パターン** | 統一Walletインターフェース | コンポーネント層は認証方式を意識しない設計。FR3「3ステップ以内」を両パスで一貫して実現 |
| **AAプロバイダー** | permissionless.js + Pimlico | モジュラーERC-4337構成。Signer/Bundler/Paymaster個別差し替え可能。Viemネイティブ。Alchemy Signerロックイン回避 |
| **Signer** | Privy（Passkey + ソーシャルログイン） | Passkey主流化への対応 + PRDのメール/SNSログイン要件を同時に満たす。permissionless.jsとの統合が公式ドキュメント化済み |
| **Litセッション管理** | メモリ内キャッシュ（1時間有効期限） | NFR-S6準拠（サーバー非保存）。現行パターンの延長。署名要求を最小化 |

### Category 3: API & Communication Patterns

| 決定 | 選択 | 根拠 |
|------|------|------|
| **サービス層抽象化** | Interface + 実装クラス（DI可能） | テスト時のモック差し替え容易。Lit Naga移行時にInterface背後の実装のみ差し替え |
| **エラーハンドリング** | Result型パターン（`{ success, data } \| { success, error }`） | 例外を値として扱う。Zodとの親和性。型安全なエラー伝播 |

### Category 4: Frontend Architecture

| 決定 | 選択 | 根拠 |
|------|------|------|
| **4-A: サービス層DI方式** | Context-based DI（ServiceProvider）+ Compose Providersパターン | WalletContextとの一貫性。テスト時Provider差し替え。Compose Providersで5-6層のネスティングを宣言的に管理 |
| **4-B: パイプライン状態管理** | useReducer（状態管理）+ usePipelineOrchestrator（副作用実行）の分離 | reducer = pure状態遷移、orchestrator = サービス呼び出し。関心の分離。テスタビリティ向上 |

**Compose Providersパターン（4-A補足）:**

providers配列で宣言的に合成し、ネスティングの見通しを確保する。`composeProviders(providers, children)`形式のユーティリティを`src/lib/compose-providers.tsx`に配置。

**react-queryの役割分担:**
- GET系（動画一覧・メタデータ取得・チャンネル情報）= @tanstack/react-query（`staleTime`設定でキャッシュ）
- パイプライン実行（アップロード・暗号化・ストレージ）= useReducer + usePipelineOrchestrator

**UploadPipelineステージ定義（4-B補足）:**

```
idle → preparing → uploading → transcoding → encrypting → storing → completed
                                                                   ↘ failed
failed → retryFromStage(指定ステージから再開) → [該当ステージ]
任意ステージ → cancelling → idle（リソースクリーンアップ後）
```

**ステージ別リトライ可否:**

| ステージ | リトライ可否 | 理由 |
|---------|------------|------|
| preparing | 可 | 冪等操作 |
| uploading | 可 | TUS resumable upload対応 |
| transcoding | 不可（待機のみ） | Livepeer側処理。ポーリング再開のみ |
| encrypting | 要再認証 | Litセッション有効期限切れの可能性 |
| storing | 可 | Irysアップロードは冪等 |

**キャンセル時クリーンアップ:**

| ステージ | クリーンアップ内容 |
|---------|------------------|
| uploading | TUSアップロード中止 |
| transcoding | ポーリング停止（Livepeer側は自動処理） |
| encrypting | Litセッション解放 |
| storing | 部分アップロード済みセグメントは放置（Irys上で孤立するが、PoCでは許容） |

**オーケストレーション分離（4-B補足）:**
- `uploadPipelineReducer` — pure関数。状態遷移のみ。`dispatch({ type: 'STAGE_COMPLETE', stage: 'uploading' })`等
- `usePipelineOrchestrator` — reducerのstateを監視し、ステージ遷移時にServiceProvider経由でサービスを呼び出す。キャンセル・リトライのリソース管理もここに集約

**ServiceProvider Interface定義:**

`LitService`, `IrysService`, `LivepeerService`, `VideoService` — 4つのInterfaceを`src/types/`に定義。`src/lib/`の各`*Impl`クラスがInterfaceを満たす。テスト時は`TestServiceProvider`で全モック注入。

### Category 5: Infrastructure & Deployment

| 決定 | 選択 | 根拠 |
|------|------|------|
| **5-A: 環境変数管理** | Zodスキーマバリデーション（起動時検証） | Zod 4採用済みの自然な拡張。型安全アクセス。変数増加時の漏れ防止 |
| **5-B: ログ・モニタリング** | 構造化console.log + DevTools（CSVフレンドリー形式） | 追加依存なし。PoC成功判定データ収集にCSVコピペ可能な形式を採用 |
| **5-C: デプロイ・CI** | Vercel自動デプロイのみ | PRDでCI/CDはP1除外。ローカルテスト実行で十分 |

**構造化ログフォーマット（5-B補足）:**

```
[METRIC] event=playback_start, duration_ms=2100, video_type=restricted, timestamp=2026-02-12T10:00:00Z
```

- `[METRIC]`プレフィックスでDevToolsフィルタリング可能
- key=value形式でCSV変換容易
- PoC成功判定（NFR-P2: 再生開始3秒以内等）のデータ集約に直結

### Decision Impact Analysis

**実装順序:**
1. Compose Providersユーティリティ + 環境変数Zodスキーマ — 基盤整備
2. サービスInterface定義（`LitService`等）+ ServiceProvider — DI基盤
3. `uploadPipelineReducer` + `usePipelineOrchestrator` — パイプライン刷新
4. react-query統合（読み取り系）— 動画一覧・メタデータキャッシュ
5. 構造化ログ埋め込み — パイプライン各ステージにインストルメンテーション

**コンポーネント間依存:**
- Compose Providers → WalletProvider → ServiceProvider → QueryClientProvider
- usePipelineOrchestrator → ServiceProvider（DIされたサービスを使用）+ uploadPipelineReducer（状態監視）
- react-query → ServiceProvider（クエリ関数がサービスInterface経由）

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**特定されたコンフリクトポイント:** 14領域。以下のルールにより、AIエージェント間の実装不整合を防止する。

### Naming Patterns

**コード命名規則:**

| 対象 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCaseファイル + PascalCaseエクスポート | `VideoUploader.tsx` → `export function VideoUploader()` |
| フック | `use`プレフィックス + camelCaseファイル | `useVideo.ts` → `export function useVideo()` |
| サービスファイル | camelCase | `lit.ts`, `irys.ts` |
| サービスクラス | PascalCase + `Impl`サフィックス | `LitServiceImpl`, `IrysServiceImpl` |
| Interface | プレフィックスなし PascalCase | `LitService`, `IrysService`, `LivepeerService`, `VideoService` |
| 型定義ファイル | camelCase | `video.ts`, `contracts.ts` |
| 型名 | PascalCase | `VideoMetadata`, `UploadProgress` |
| 変数・関数 | camelCase | `uploadVideo`, `walletClient` |
| Reducerアクション | SCREAMING_SNAKE_CASE | `STAGE_COMPLETE`, `PROGRESS_UPDATE`, `RETRY_FROM_STAGE` |
| 定数 | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE`, `VIDEO_CATEGORIES` |

**`Impl`サフィックスに関する注記:** PoC段階では1 Interface = 1実装のため`Impl`で統一する。Lit Naga移行等で複数実装が共存する場合、具体名（`NagaLitService`, `DatilLitService`）にリネームする。移行コストはfind-and-replace 1回で許容範囲。

**Import順序規則（ESLint `import/order`で強制）:**

```
1. React / Next.js         — import { useState } from 'react'
2. 外部ライブラリ           — import { z } from 'zod'
3. @/types/                — import type { VideoMetadata } from '@/types/video'
4. @/lib/                  — import { litService } from '@/lib/lit'
5. @/hooks/                — import { useVideo } from '@/hooks/useVideo'
6. @/contexts/             — import { useWalletContext } from '@/contexts/WalletContext'
7. @/components/           — import { VideoCard } from '@/components/video/VideoCard'
8. 相対パス                 — import { helper } from './utils'
```

**Irysタグ命名規則:**

| 規則 | 例 | 備考 |
|------|-----|------|
| PascalCase（ハイフンなし） | `AppName`, `AccessType`, `Creator` | 既存の`App-Name`は移行時に統一 |
| 例外: HTTP標準ヘッダー | `Content-Type` | HTTP仕様準拠のため例外許容 |
| テストデータ分離 | `AppName: "DecentralizedVideo-Test"` | テスト用プレフィックスで本番と分離 |

### Structure Patterns

**プロジェクト構造:**

```
src/
  app/              # Next.js App Router ページ
  components/       # UIコンポーネント（機能別サブディレクトリ）
    video/
    monetization/
  contexts/         # React Context（WalletContext, ServiceContext）
  hooks/            # カスタムフック
  lib/              # サービス層（プロトコル統合ロジック）
  types/            # 共有型定義（Interface含む）
  test-utils/       # テスト共通ユーティリティ
    test-providers.tsx   # モックServiceProviderファクトリ
    test-helpers.ts      # renderWithProviders()等
tests/
  e2e/              # Playwright E2Eテスト（*.spec.ts）
```

**テストファイル配置:**

| テスト種別 | 拡張子 | 配置 | 例 |
|-----------|--------|------|-----|
| Unit / Integration | `.test.ts` | ソースファイルと同一ディレクトリ（コロケーション） | `src/lib/lit.test.ts` |
| E2E | `.spec.ts` | `tests/e2e/` | `tests/e2e/upload.spec.ts` |

**テスト必須ルール:**

| ファイル種別 | テスト必須 | 理由 |
|------------|----------|------|
| Zodスキーマを含むファイル | 必須 | バリデーションロジックの正確性保証 |
| サービス層（`src/lib/`） | 必須 | ビジネスロジックの中核 |
| Reducer | 必須 | 状態遷移の正確性保証 |
| 純粋型定義（`src/types/`） | 不要 | ランタイムロジックなし |
| UIコンポーネント | E2Eでカバー | PoC段階ではUnit不要。E2Eで十分 |

**テストユーティリティパターン:**

`src/test-utils/test-providers.tsx`に`renderWithProviders()`ヘルパーを配置。全コンポーネントテストはこれを使用し、モックServiceProvider設定の重複を排除。

### Format Patterns

**Result型（統一戻り値）:**

```typescript
type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E }
```

- サービス層の全パブリックメソッドは`Result<T>`を返す
- `throw`は使用しない（サービス層内部で`try/catch`し、`Result`に変換）
- Zodの`safeParse`と同一パターン

**サービス初期化のファクトリパターン:**

constructorからはResultを返せないため、非同期初期化が必要なサービスは**ファクトリパターン**で統一する：

```typescript
class LitServiceImpl implements LitService {
  private constructor(private client: LitNodeClient) {}

  static async create(options?: { signal?: AbortSignal }): Promise<Result<LitServiceImpl>> {
    try {
      const client = new LitNodeClient({ ... });
      await client.connect();
      return { success: true, data: new LitServiceImpl(client) };
    } catch (e) {
      return { success: false, error: { category: 'lit', code: 'INIT_FAILED', ... } };
    }
  }
}
```

- constructorは`private`。引数検証のみ
- `static async create()`がResult型で初期化結果を返す
- ServiceProviderがこのファクトリを呼び出す

**AppError（統一エラー型）:**

```typescript
type ErrorCategory = 'lit' | 'irys' | 'livepeer' | 'wallet' | 'pipeline'

type AppError = {
  category: ErrorCategory
  code: string              // 例: 'SESSION_EXPIRED', 'INSUFFICIENT_FUNDS'
  message: string           // ユーザー向けメッセージ
  retryable: boolean        // UIリトライボタン表示判定
  cause?: unknown           // 元のSDKエラー（デバッグ用）
}
```

- `category`でプロトコル別フィルタリング
- `retryable`でパイプラインのステージ別リトライ判定と連携
- `cause`は構造化ログ出力時にのみ参照

### Communication Patterns

**Pipelineステートマシン型定義:**

```typescript
type PipelineStage = 'idle' | 'preparing' | 'uploading' | 'transcoding'
                   | 'encrypting' | 'storing' | 'completed' | 'failed' | 'cancelling'

type PipelineState = {
  stage: PipelineStage
  progress: number                      // 0-100
  message: string
  error: AppError | null
  retryCount: number
  lastCompletedStage: PipelineStage | null  // リトライ復帰ポイント
}

type PipelineAction =
  | { type: 'STAGE_START'; stage: PipelineStage }
  | { type: 'STAGE_COMPLETE'; stage: PipelineStage }
  | { type: 'PROGRESS_UPDATE'; stage: PipelineStage; progress: number; message: string }
  | { type: 'STAGE_FAILED'; error: AppError }
  | { type: 'RETRY_FROM_STAGE'; stage: PipelineStage }
  | { type: 'CANCEL' }
  | { type: 'RESET' }
```

- `PROGRESS_UPDATE`に`stage`フィールドを含む（デバッグ時にどのステージのprogressか明確に）
- reducerは**pure関数**。`switch`文での網羅性チェック（TypeScript `never`型利用）

**AbortSignalキャンセルパターン:**

サービスInterfaceの非同期メソッドに`signal?: AbortSignal`をオプショナルで統一的に追加：

```typescript
interface LitService {
  encrypt(data: Uint8Array, acc: ACC, options?: { signal?: AbortSignal }): Promise<Result<EncryptedData>>
  decrypt(data: EncryptedData, options?: { signal?: AbortSignal }): Promise<Result<Uint8Array>>
}
```

- `usePipelineOrchestrator`が`AbortController`を管理
- `CANCEL`ディスパッチ時に`controller.abort()`を呼び出し、進行中のHTTPリクエスト・SDK呼び出しを中止
- 各サービス実装は`signal`を内部の`fetch()`等に伝播

### Process Patterns

**ローディング状態パターン:**

| 場面 | 状態変数名 | UI表現 |
|------|----------|--------|
| データフェッチ（GET系） | `isLoading` | Skeleton UI |
| パイプライン処理中 | `isProcessing` + `PipelineState` | ステージ名 + プログレスバー + メッセージ |
| ボタン操作中 | `isPending` | ボタン内スピナー + disabled |

**構造化ログフォーマット:**

```
[METRIC] event=playback_start, duration_ms=2100, video_type=restricted, timestamp=2026-02-12T10:00:00Z
[METRIC] event=irys_upload, size_bytes=1048576, cost_atomic=500000, duration_ms=3200, timestamp=...
```

- `[METRIC]`プレフィックスでDevToolsフィルタリング
- key=value形式でCSV変換容易

### Enforcement Guidelines

**全AIエージェントが遵守すべきルール:**

1. サービス層メソッドは必ず`Result<T>`を返す。`throw`禁止
2. 非同期初期化は`static async create(): Promise<Result<T>>`ファクトリパターン
3. 非同期サービスメソッドは`options?: { signal?: AbortSignal }`をオプショナル引数に含める
4. Reducerアクションは`PipelineAction`型に定義されたもののみ使用
5. 新規Irysタグ追加時はPascalCase（ハイフンなし）
6. テストファイルはUnit = `.test.ts`（コロケーション）、E2E = `.spec.ts`（`tests/e2e/`）
7. Import順序はESLint `import/order`ルールに従う
8. Zodスキーマを含むファイルにはテスト必須
9. コンポーネントテストは`renderWithProviders()`を使用
10. ローディング状態は`isLoading`/`isProcessing`/`isPending`を用途で使い分け
11. 計測対象のイベントには`[METRIC]`プレフィックス付き構造化ログを出力

**アンチパターン（禁止事項）:**

| 禁止 | 理由 | 正しい方法 |
|------|------|-----------|
| サービス層で`throw`する | Result型の一貫性が崩れる | `{ success: false, error }` を返す |
| `new LitServiceImpl()`で直接インスタンス化 | 非同期初期化のResult化ができない | `LitServiceImpl.create()` |
| `ILitService`のようなIプレフィックス | TypeScript慣習に反する | `LitService`（Interface） |
| `lit.spec.ts`でUnitテストを書く | `.spec.ts`はE2E専用 | `lit.test.ts`を使用 |
| `isLoading`でパイプライン状態を表す | GET系と混同する | `isProcessing`を使用 |
| Irysタグに`App-Name`（ハイフン入り） | PascalCase統一に反する | `AppName` |
| fetch呼び出しで`signal`を無視する | キャンセルが効かなくなる | `options?.signal`を伝播 |

## Project Structure & Boundaries

### Complete Project Directory Structure

`[既存]` = 現行ファイル、`[新規]` = アーキテクチャ決定に基づく追加ファイル

```
irys-poc/
├── .env.local                          # [既存] 環境変数（git除外）
├── .env.example                        # [既存] 環境変数テンプレート
├── .gitignore                          # [既存]
├── .gitmodules                         # [既存] contracts/lib サブモジュール
├── CLAUDE.md                           # [既存] AI開発ガイド
├── README.md                           # [既存]
├── eslint.config.mjs                   # [既存→更新] import/order ルール追加
├── mise.toml                           # [既存] Node.js v24
├── next.config.ts                      # [既存] webpack フラグ
├── next-env.d.ts                       # [既存]
├── package.json                        # [既存→更新] vitest, playwright 追加
├── pnpm-lock.yaml                      # [既存]
├── postcss.config.mjs                  # [既存]
├── tsconfig.json                       # [既存]
├── vitest.config.ts                    # [新規] Vitest設定（@/ alias同期）
├── playwright.config.ts                # [新規] Playwright E2E設定
│
├── src/
│   ├── app/                            # --- Next.js App Router ---
│   │   ├── globals.css                 # [既存]
│   │   ├── layout.tsx                  # [既存] RootLayout → Providers
│   │   ├── providers.tsx               # [既存→更新] composeProviders適用
│   │   ├── page.tsx                    # [既存] トップ（動画一覧）
│   │   ├── (auth)/
│   │   │   └── upload/
│   │   │       └── page.tsx            # [既存] アップロードページ
│   │   ├── watch/
│   │   │   └── [videoId]/
│   │   │       └── page.tsx            # [既存] 動画再生ページ
│   │   ├── channel/
│   │   │   └── [address]/
│   │   │       └── page.tsx            # [既存] チャンネルページ
│   │   └── api/
│   │       └── videos/
│   │           └── route.ts            # [既存] GraphQLプロキシ
│   │
│   ├── components/                     # --- UIコンポーネント ---
│   │   ├── Login.tsx                   # [既存]
│   │   ├── UploadForm.tsx              # [既存]
│   │   ├── FileList.tsx                # [既存]
│   │   ├── video/
│   │   │   ├── VideoUploader.tsx       # [既存→更新] usePipelineOrchestrator統合
│   │   │   ├── VideoCard.tsx           # [既存]
│   │   │   ├── VideoPlayer.tsx         # [既存]
│   │   │   └── TranscodeProgress.tsx   # [既存]
│   │   └── monetization/
│   │       └── TippingWidget.tsx       # [既存]
│   │
│   ├── contexts/                       # --- React Context ---
│   │   ├── WalletContext.tsx            # [既存]
│   │   └── ServiceContext.tsx           # [新規] サービスDI Provider
│   │
│   ├── hooks/                          # --- カスタムフック ---
│   │   ├── useWallet.ts                # [既存]
│   │   ├── useVideo.ts                 # [既存→更新] ServiceContext経由に変更
│   │   ├── useTranscode.ts             # [既存]
│   │   └── usePipelineOrchestrator.ts  # [新規] パイプライン副作用オーケストレーター
│   │
│   ├── lib/                            # --- サービス層 ---
│   │   ├── compose-providers.tsx        # [新規] Provider合成ユーティリティ
│   │   ├── config.ts                   # [既存→更新] Zodスキーマバリデーション化
│   │   ├── config.test.ts              # [新規] 環境変数スキーマテスト
│   │   ├── lit.ts                      # [既存→更新] LitServiceImpl（LitService Interface実装）
│   │   ├── lit.test.ts                 # [新規] Lit暗号化/復号ユニットテスト
│   │   ├── irys.ts                     # [既存→更新] IrysServiceImpl
│   │   ├── irys.test.ts                # [新規] Irysアップロード/クエリテスト
│   │   ├── livepeer.ts                 # [既存→更新] LivepeerServiceImpl
│   │   ├── livepeer.test.ts            # [新規] Livepeerアセット/TUSテスト
│   │   ├── video.ts                    # [既存→更新] VideoServiceImpl
│   │   ├── video.test.ts               # [新規] パイプライン統合テスト
│   │   ├── encryption.ts               # [既存→更新] Naga移行対応
│   │   ├── encryption.test.ts          # [新規] ACC生成/暗号化テスト
│   │   ├── alchemy.ts                  # [既存]
│   │   ├── pipeline-reducer.ts         # [新規] uploadPipelineReducer
│   │   └── pipeline-reducer.test.ts    # [新規] 状態遷移テスト
│   │
│   ├── types/                          # --- 型定義 ---
│   │   ├── global.d.ts                 # [既存]
│   │   ├── video.ts                    # [既存]
│   │   ├── contracts.ts                # [既存]
│   │   ├── services.ts                 # [新規] LitService, IrysService等 Interface
│   │   ├── errors.ts                   # [新規] AppError, ErrorCategory, Result<T>
│   │   └── pipeline.ts                 # [新規] PipelineStage, PipelineState, PipelineAction
│   │
│   └── test-utils/                     # [新規] --- テスト共通 ---
│       ├── test-providers.tsx           # [新規] モックServiceProviderファクトリ
│       └── test-helpers.ts             # [新規] renderWithProviders()等
│
├── tests/                              # [新規] --- E2Eテスト ---
│   └── e2e/
│       ├── public-video-upload.spec.ts  # [新規] 公開動画アップロード→再生E2E
│       ├── restricted-video.spec.ts     # [新規] 限定動画ACC→復号E2E
│       ├── tipping.spec.ts              # [新規] 投げ銭E2E
│       └── wallet-connect.spec.ts       # [新規] ウォレット接続E2E
│
├── contracts/                          # --- Foundry Smart Contracts ---
│   ├── foundry.toml                    # [既存]
│   ├── src/
│   │   └── VideoTipping.sol            # [既存]
│   ├── lib/
│   │   ├── forge-std/                  # [既存] サブモジュール
│   │   └── openzeppelin-contracts/     # [既存] サブモジュール
│   └── test/                           # [既存] Foundryテスト
│
├── public/                             # [既存] 静的アセット
│
└── docs/                               # [既存] プロジェクトドキュメント
    ├── index.md
    ├── project-overview.md
    ├── architecture.md
    ├── source-tree-analysis.md
    ├── development-guide.md
    ├── component-inventory.md
    ├── api-contracts.md
    └── research/
        └── livepeer-theta-comparison.md
```

### Architectural Boundaries

**サービス境界（依存方向: コンポーネント → フック → サービス → 外部SDK）:**

```
[UIコンポーネント層]
  VideoUploader, VideoPlayer, TippingWidget ...
       │ props + ServiceContext
       ▼
[フック層]
  useVideo, usePipelineOrchestrator, useWallet
       │ ServiceContext.useContext()
       ▼
[サービスInterface層]   ← 境界線 ← テスト時はここでモック差し替え
  LitService, IrysService, LivepeerService, VideoService
       │
       ▼
[サービス実装層]
  LitServiceImpl, IrysServiceImpl, LivepeerServiceImpl, VideoServiceImpl
       │
       ▼
[外部SDK/プロトコル]
  @lit-protocol/*, @irys/web-upload, livepeer SDK, viem
```

**パイプライン境界（公開動画 vs 限定動画）:**

| パイプライン | 使用サービス | Lit障害時 |
|------------|------------|----------|
| 公開動画アップロード | Livepeer → Irys | 影響なし（Lit不使用） |
| 限定動画アップロード | Livepeer → Lit → Irys | ブロック |
| 公開動画再生 | Irys Gateway → hls.js | 影響なし |
| 限定動画再生 | Irys → Lit（復号）→ hls.js | ブロック |

**API境界:**

| エンドポイント | 役割 | 境界 |
|-------------|------|------|
| `src/app/api/videos/route.ts` | Irys GraphQLプロキシ | サーバーサイド唯一のAPI Route。CORSヘッダー付与のみ |
| 外部: `uploader.irys.xyz/graphql` | Irysメタデータクエリ | クライアント/API Route双方から呼び出し |
| 外部: `gateway.irys.xyz/{id}` | Irysデータ取得 | クライアント直接アクセス |
| 外部: Livepeer Studio API | アセット管理・TUSアップロード | LivepeerServiceImpl経由のみ |
| 外部: Lit Nodes | 暗号化・復号 | LitServiceImpl経由のみ |

### Requirements to Structure Mapping

**FR カテゴリ → ファイルマッピング:**

| FRカテゴリ | 主要ファイル | テスト |
|-----------|------------|--------|
| 認証 (FR1-FR6) | `contexts/WalletContext.tsx`, `hooks/useWallet.ts`, `lib/alchemy.ts` | `e2e/wallet-connect.spec.ts` |
| 動画管理 (FR7-FR16) | `lib/video.ts`, `lib/livepeer.ts`, `lib/pipeline-reducer.ts`, `hooks/usePipelineOrchestrator.ts`, `components/video/VideoUploader.tsx` | `lib/pipeline-reducer.test.ts`, `e2e/public-video-upload.spec.ts` |
| 動画再生 (FR17-FR20) | `components/video/VideoPlayer.tsx`, `lib/encryption.ts` | `lib/encryption.test.ts`, `e2e/restricted-video.spec.ts` |
| コンテンツアクセス制御 (FR27-FR30) | `lib/lit.ts`, `lib/encryption.ts` | `lib/lit.test.ts`, `lib/encryption.test.ts` |
| 収益化 (FR31-FR36) | `components/monetization/TippingWidget.tsx`, `contracts/src/VideoTipping.sol` | `e2e/tipping.spec.ts` |

**Cross-Cutting Concerns → ファイルマッピング:**

| 横断的関心事 | 主要ファイル |
|------------|------------|
| #1 認証・ウォレット管理 | `contexts/WalletContext.tsx`, `contexts/ServiceContext.tsx` |
| #2 プロトコル抽象化層 | `types/services.ts`（Interface定義）, `lib/*.ts`（Impl） |
| #3 統一エラーマッピング | `types/errors.ts`, 各`*Impl`の`try/catch → Result`変換 |
| #4 パイプライン独立性 | `lib/pipeline-reducer.ts`, `hooks/usePipelineOrchestrator.ts` |
| #5 コスト計測 | 各サービスメソッド内の`[METRIC]`構造化ログ |
| #6 暗号化/復号ライフサイクル | `lib/lit.ts`, `lib/encryption.ts` |
| #7 プロトコルバージョン管理 | `types/services.ts`（Interface）でバージョン差異を吸収 |

### Data Flow

**アップロードパイプライン（限定動画）:**

```
[VideoUploader] → dispatch(STAGE_START)
       │
[usePipelineOrchestrator] ← state監視
       │
       ├─ preparing:  LivepeerService.createAsset()
       ├─ uploading:  LivepeerService.uploadWithTus() + AbortSignal
       ├─ transcoding: LivepeerService.waitForReady() ポーリング
       ├─ encrypting: LitService.encrypt() + ACC
       ├─ storing:    IrysService.uploadData() × Nセグメント
       └─ completed:  メタデータCID返却
```

**再生パイプライン（限定動画）:**

```
[VideoPlayer] → useVideo.fetchVideoById()
       │
       ├─ react-query キャッシュ確認
       ├─ IrysService.getMetadata() → VideoMetadata
       ├─ LitService.getSession() → AuthSig
       ├─ セグメント順次復号（プログレッシブ）
       │   └─ hls.js カスタムローダー → LitService.decrypt() → 再生開始
       └─ [METRIC] playback_start ログ出力
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

全技術選択に矛盾なし。Next.js 16 + React 19 + Viem + TailwindCSS 4 + Zod 4 + react-query 5 + Vitest 4 + Playwright 1.58 — 全て互換。Webpack制約はLit Protocol要件で必然。Category 1-5の決定間に論理的矛盾なし。

**Pattern Consistency:**

命名規則（PascalCase/camelCase/SCREAMING_SNAKE_CASE）が用途別に明確分離。Result型 + AppErrorが全サービス層に統一適用。AbortSignalが全非同期メソッドに統一的に適用。Import順序がESLintで自動強制。

**Structure Alignment:**

プロジェクト構造が全決定を直接反映。ServiceContext.tsx（Category 4-A）、pipeline-reducer.ts + usePipelineOrchestrator.ts（Category 4-B）、types/services.ts（Category 3）、コロケーション + tests/e2e/（Step 5パターン）。

### Requirements Coverage Validation ✅

**Functional Requirements（38件）: 全件カバー**

| FRカテゴリ | 件数 | カバレッジ | アーキテクチャサポート |
|-----------|------|----------|-------------------|
| 認証・オンボーディング (FR1-FR6) | 6 | ✅ | Category 2: Privy + permissionless.js + 統一Wallet IF |
| 動画管理 (FR7-FR16) | 10 | ✅ | Category 4: Pipeline reducer + ServiceProvider DI |
| 動画再生 (FR17-FR20) | 4 | ✅ | LitService.decrypt() + hls.jsカスタムローダー |
| 投げ銭 (FR21-FR26) | 6 | ✅ | VideoTipping.sol + TippingWidget + viem |
| アクセス制御 (FR27-FR30) | 4 | ✅ | LitService + ACC + パイプライン独立性 |
| コンテンツ発見 (FR31-FR35) | 5 | ✅ | react-query + Irys GraphQL + タグフィルタリング |
| 運用・コスト監視 (FR36-FR38) | 3 | ✅ | `[METRIC]`構造化ログ + Playwright E2E |

**Non-Functional Requirements（20件）: 全件カバー**

| NFRカテゴリ | 件数 | カバレッジ | アーキテクチャサポート |
|------------|------|----------|-------------------|
| Performance (NFR-P1~P5) | 5 | ✅ | プログレッシブ復号設計、`[METRIC]`ログで計測 |
| Security (NFR-S1~S6) | 6 | ✅ | クライアントサイド完結、Zodバリデーション、NEXT_PUBLIC_管理 |
| Integration (NFR-I1~I6) | 6 | ✅ | サービス抽象化層、タイムアウト設定、パイプライン独立性 |
| Reliability (NFR-R1~R3) | 3 | ✅ | グレースフルデグラデーション、Pipeline reducer状態明示、E2E |

### Gap Analysis Results

**Critical Gaps: なし**

**Important Gaps（実装時に対応）:**

| Gap | 対応方針 |
|-----|---------|
| FR16: IrysService Interfaceに`deposit()`/`getBalance()`未明記 | Interface定義時に含める |
| NFR-I3: タイムアウト値の設定場所未定義 | Zodスキーマの環境変数 or サービスファクトリの`create()`オプションで外部化 |

**Nice-to-Have Gaps（PoC後検討）:**

| Gap | 詳細 |
|-----|------|
| Web Worker切り出し | Lit復号のCPU集約処理。NFR-P2（3秒以内）を満たせない場合に検討 |
| エラーコード一覧 | `AppError.code`の全コード定義。実装時に段階的に追加 |

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] プロジェクトコンテキスト分析完了（38 FR, 20 NFR, 7 Cross-Cutting Concerns）
- [x] スケール・複雑度評価完了（高複雑度、15-20コンポーネント）
- [x] 技術制約特定完了（Lit Naga移行、クライアントサイド完結、Webpack必須）
- [x] 横断的関心事マッピング完了（7領域）

**✅ Architectural Decisions**
- [x] 全5カテゴリの決定が文書化・バージョン検証済み
- [x] 技術スタック完全指定（既存 + 追加パッケージ + Naga移行パッケージ）
- [x] 統合パターン定義（サービス抽象化 + Result型 + DI）
- [x] パフォーマンス考慮（プログレッシブ復号、react-queryキャッシュ、計測ポイント）

**✅ Implementation Patterns**
- [x] 命名規則確立（11カテゴリ + Import順序 + Irysタグ）
- [x] 構造パターン定義（テスト配置、テスト必須ルール、test-utils）
- [x] 通信パターン指定（Pipeline型定義、AbortSignal、ファクトリパターン）
- [x] プロセスパターン文書化（ローディング状態、構造化ログ、エラー型）
- [x] Enforcement Guidelines + Anti-patterns（11ルール + 7禁止事項）

**✅ Project Structure**
- [x] 完全ディレクトリ構造定義（既存/新規の区別付き）
- [x] コンポーネント境界確立（4層アーキテクチャ + Interface境界線）
- [x] 統合ポイントマッピング（API境界 + パイプライン境界）
- [x] 要件→構造マッピング完了（FRカテゴリ + Cross-Cutting Concerns）

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: HIGH**

**Key Strengths:**
1. パイプライン独立性が明確 — 公開/限定動画の分離度がNFR-I2/I6を直接支える
2. テスタビリティが高い — Context-based DI + Interface + ファクトリパターンでモック差し替え容易
3. Naga移行の影響範囲が封じ込め済み — Interface背後の実装のみ差し替え（`lit.ts` + `encryption.ts`の2ファイル）
4. 型安全性が徹底 — Result型、PipelineAction discriminated union、Zodバリデーションの三重保証
5. 既存コードとの乖離が最小 — ブラウンフィールド前提で段階的リファクタリング可能

**Areas for Future Enhancement:**
- Web Worker切り出し（パフォーマンス最適化）
- エラーコード全量定義（実装時に段階的追加）
- CI/CD パイプライン（P1スコープ）
- @irys/query パッケージ移行（P1スコープ）

### Implementation Handoff

**AI Agent Guidelines:**
- 本アーキテクチャ文書の全決定に従って実装すること
- Implementation Patterns のEnforcement Guidelinesを厳守
- プロジェクト構造と境界を遵守
- アーキテクチャに関する判断に迷った場合、本文書を参照

**First Implementation Priority:**
1. Next.js 16.0.8 → 16.1.6 LTSアップデート（CVE-2025-66478対応 — セキュリティ最優先）
2. Zodスキーマ環境変数バリデーション（`src/lib/config.ts`リファクタ）
3. 型定義ファイル新設（`types/errors.ts`, `types/services.ts`, `types/pipeline.ts`）
4. Lit Protocol Naga移行（2/25期限 — ブロッカー）
