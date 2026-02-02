# DecentralizedVideo プロジェクトドキュメント

## プロジェクト概要

- **タイプ:** モノリス Web アプリケーション + Solidityスマートコントラクト
- **主要言語:** TypeScript, Solidity
- **アーキテクチャ:** コンポーネントベースフロントエンド + 分散型サービス統合
- **フレームワーク:** Next.js 16 (App Router), React 19, Foundry

### クイックリファレンス

- **技術スタック:** Next.js 16 + React 19 + TailwindCSS 4 + Viem + Lit Protocol + Irys + Livepeer + hls.js
- **エントリポイント:** `src/app/layout.tsx`
- **アーキテクチャパターン:** クライアントサイドオーケストレーション + 分散型プロトコル統合
- **パッケージマネージャー:** pnpm 10.25.0
- **Node.js:** v24 (mise)

## 生成ドキュメント

- [プロジェクト概要](./project-overview.md) — 技術スタック、データフロー、ネットワーク設定
- [アーキテクチャ](./architecture.md) — サービスレイヤー、アクセス制御パターン、スマートコントラクト、状態管理
- [ソースツリー分析](./source-tree-analysis.md) — ディレクトリ構造、エントリポイント、ファイル統計
- [コンポーネントインベントリ](./component-inventory.md) — UIコンポーネント一覧、依存関係図、デザインパターン
- [APIコントラクト](./api-contracts.md) — REST API、外部API統合、スマートコントラクトAPI、Irysタグスキーマ
- [開発ガイド](./development-guide.md) — セットアップ手順、コマンド、設定、既知の制約

## 既存ドキュメント

- [README.md](../README.md) — デフォルトNext.js README
- [CLAUDE.md](../CLAUDE.md) — Claude Code向けプロジェクト設定
- [環境変数テンプレート](../.env.example) — 必要な環境変数一覧

### BMAD成果物

- [ブレインストーミングセッション](../_bmad-output/brainstorming/brainstorming-session-2026-02-01.md) — 分散型動画プラットフォーム戦略
- [市場調査](../_bmad-output/planning-artifacts/research/market-decentralized-video-monetization-research-2026-02-01.md) — 分散型動画マネタイゼーションモデル
- [技術調査](../_bmad-output/planning-artifacts/research/technical-irys-livepeer-lit-architecture-research-2026-02-02.md) — Irys、Livepeer、Lit Protocolアーキテクチャ

## Getting Started

```bash
# 依存関係インストール
pnpm install

# 環境変数設定
cp .env.example .env.local
# .env.localを編集して必要なAPIキーを設定

# 開発サーバー起動
pnpm dev
```

詳細は[開発ガイド](./development-guide.md)を参照してください。
