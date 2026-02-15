---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
status: 'complete'
completedAt: '2026-02-15'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# irys-poc - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for irys-poc, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

#### ユーザー認証・オンボーディング
- FR1: 一般ユーザーはメールまたはSNSアカウントでログインできる
- FR2: Web3ユーザーはMetaMaskウォレットで接続できる
- FR3: ユーザーは3ステップ以内でオンボーディングを完了し、動画視聴を開始できる
- FR4: ユーザーは自分のプロフィール情報（ウォレットアドレス等）を確認できる
- FR5: AAログイン失敗時、ユーザーはMetaMaskでのログインに切り替えられる
- FR6: ユーザーはログアウトできる

#### 動画管理
- FR7: クリエイターは動画ファイルをアップロードできる
- FR8: クリエイターは動画のメタデータ（タイトル、説明、カテゴリ、アクセスタイプ）を設定できる
- FR9: クリエイターはアップロード・トランスコードの進捗状況を確認できる
- FR10: クリエイターは動画を「公開」または「限定」として公開できる
- FR11: システムはアップロードされた動画を自動的にトランスコードし、ストリーミング形式で保存する
- FR12: システムは限定動画をアクセス制御条件付きで暗号化して保存する
- FR13: トランスコード失敗時、クリエイターはサポート形式の案内とともにエラーを確認できる
- FR14: ストレージ残高不足時、クリエイターはエラーと残高追加方法を確認できる
- FR15: クリエイターは自分がアップロードした動画の一覧を確認できる
- FR16: クリエイターはIrysストレージに資金をデポジットできる

#### 動画再生
- FR17: ユーザーは公開動画をログイン不要で視聴できる
- FR18: 条件を満たすユーザーは限定動画を視聴できる
- FR19: 限定動画の復号処理中、ユーザーは進捗と理由の表示を確認できる
- FR20: ユーザーは動画の詳細情報（タイトル、説明、クリエイター情報）を閲覧できる

#### 投げ銭
- FR21: ファンはクリエイターに対して投げ銭を送信できる
- FR22: ファンは投げ銭額をプリセットから選択できる
- FR23: ファンは投げ銭送信後、オンチェーンでの到達確認を表示で確認できる
- FR24: ファンはトランザクションの詳細をブロックチェーンエクスプローラーで確認できる
- FR25: クリエイターは投げ銭の受領通知を受け取ることができる
- FR26: 残高不足時、ファンはエラー表示と残高追加方法の案内を確認できる

#### コンテンツアクセス制御
- FR27: 限定動画へのアクセス時、条件を満たさないユーザーにはロック画面が表示される
- FR28: ロック画面にはアクセス条件と現在の充足状況が表示される
- FR29: ユーザーが条件を満たした場合、自動的にアクセスが許可される
- FR30: 送信者と受信者の両方が、暗号化されたコンテンツを復号できる

#### コンテンツ発見
- FR31: ユーザーはプラットフォーム上の動画一覧を閲覧できる
- FR32: ユーザーはタグやカテゴリで動画をフィルタリングできる
- FR33: ユーザーは動画の公開/限定の区別を一覧上で識別できる
- FR34: ユーザーはクリエイター別に動画を絞り込むことができる
- FR35: ユーザーは自分のウォレット残高を確認できる

#### 運用・コスト監視
- FR36: 運営者は各プロトコル（Irys, Livepeer, Lit）の実効コストを記録・参照できる
- FR37: 運営者は外部プロトコルのステータスページへのリンクを参照できる
- FR38: 主要パイプライン（公開動画、限定動画、投げ銭、AA）のE2Eテストが自動実行できる

### NonFunctional Requirements

#### Performance
- NFR-P1: 公開動画の再生開始時間 — 1秒以内（ブロードバンド接続 下り10Mbps以上環境で計測）
- NFR-P2: 限定動画の再生開始時間（復号含む） — 3秒以内（ブロードバンド接続 下り10Mbps以上環境で計測）
- NFR-P3: ページ初期ロード時間 — 3秒以内（LCP）
- NFR-P4: 投げ銭トランザクション確認表示 — 送信→確認表示までの時間を計測・記録
- NFR-P5: 動画アップロード→公開までの所要時間 — 計測・記録（トランスコード時間含む）

#### Security
- NFR-S1: ウォレット秘密鍵はサーバー側に送信・保存しない
- NFR-S2: 限定コンテンツはACC条件を満たすウォレットのみ復号可能
- NFR-S3: スマートコントラクトは意図した送金先以外に資金を送らない
- NFR-S4: API通信はすべてHTTPS経由
- NFR-S5: サーバーサイド専用の秘密情報が`NEXT_PUBLIC_`プレフィックスで公開されない
- NFR-S6: Lit認証セッション（Session Signatures）はサーバー側に保存しない

#### Integration
- NFR-I1: 各プロトコルSDKのバージョンを固定する
- NFR-I2: Lit Protocol障害時、公開動画の視聴は影響を受けない
- NFR-I3: 外部プロトコルAPIのレスポンスタイムアウトをプロトコル別に設定する（Lit: 60秒、Livepeer: 30秒、Irys: 15秒）
- NFR-I4: Irys GraphQLエンドポイントは環境変数で設定可能
- NFR-I5: 外部プロトコルのエラーはユーザーに理解可能な形で表示する
- NFR-I6: Livepeer障害時、Irysに保存済みの動画の再生は影響を受けない

#### Reliability
- NFR-R1: 単一プロトコル障害時、他の機能は正常に動作する
- NFR-R2: トランザクション送信後のネットワーク切断時、ユーザーに状態を明示する
- NFR-R3: E2Eテストで主要4パイプラインの正常動作を継続的に検証する

### Additional Requirements

#### Architectureからの技術要件
- Next.js 16.0.8 → 16.1.6 LTSアップデート（CVE-2025-66478: CVSS 10.0 — セキュリティ最優先）
- Lit Protocol Naga移行（SDK v7→v8、2/25期限。DKG差異によりDatil暗号化データはNagaで復号不可）
- サービス層抽象化: Interface + 実装クラス（DI可能）。LitService, IrysService, LivepeerService, VideoService
- Context-based DI: ServiceProvider + Compose Providersパターン（`src/lib/compose-providers.tsx`）
- パイプライン状態管理: useReducer（uploadPipelineReducer）+ usePipelineOrchestrator（副作用実行）の分離
- 環境変数管理: Zodスキーマバリデーション（起動時検証、`src/lib/config.ts`リファクタ）
- エラーハンドリング: Result型パターン + AppError統一エラー型（category, code, message, retryable, cause）
- 構造化ログ: `[METRIC]`プレフィックス + key=value形式（CSVフレンドリー）
- テスト基盤: Vitest 4.x（Unit/Integration）+ Playwright 1.58.x（E2E）
- サービス初期化: ファクトリパターン（`static async create(): Promise<Result<T>>`）
- キャンセルパターン: AbortSignal統一（全非同期サービスメソッドに`options?: { signal?: AbortSignal }`）
- AA変更: Alchemy Account Kit → permissionless.js + Pimlico + Privy（Passkey + ソーシャルログイン）
- 型定義新設: `types/errors.ts`, `types/services.ts`, `types/pipeline.ts`
- テストユーティリティ: `src/test-utils/test-providers.tsx`（モックServiceProviderファクトリ）、`renderWithProviders()`
- スターターテンプレートなし（ブラウンフィールド — 既存コードベース上で段階的リファクタリング）

#### UX Designからの追加要件
- Web3オンボーディング: 3ステップ以内（ログイン→プロフィール確認→動画視聴開始）
- 非同期処理の待機体験: 投げ銭10-30秒ローディング、復号目標3秒、アップロード5段階進捗表示
- エラーリカバリー: 常に代替手段を提示（AA失敗→MetaMask、ネットワークエラー→再試行）
- 2つの認証パス（AA/MetaMask）の統合UI: 分岐最小化、統一Walletインターフェース
- 限定動画UX: ロック画面→条件表示→条件達成→復号ローディング→再生の体験フロー
- 初回/リピート投げ銭の体験分離（初回は教育的モーメント、リピートは1タップ簡潔に）
- レスポンシブデザイン: デスクトップファースト、タッチ操作対応（タップターゲット44px以上）
- 段階的透明性原則: デフォルトはシンプル表示、詳細展開可能
- 待機時間の価値転換: 処理中メッセージで「何が起きているか」を教育的に伝える

### FR Coverage Map

- FR1: Epic 1 — AAログイン（メール/SNS）
- FR2: Epic 1 — MetaMaskウォレット接続
- FR3: Epic 1 — 3ステップ以内のオンボーディング
- FR4: Epic 1 — プロフィール情報確認
- FR5: Epic 1 — AAログイン失敗時のMetaMaskフォールバック
- FR6: Epic 1 — ログアウト
- FR7: Epic 2 — 動画ファイルアップロード
- FR8: Epic 2 — 動画メタデータ設定
- FR9: Epic 2 — アップロード・トランスコード進捗表示
- FR10: Epic 2/4 — 公開/限定として公開（公開=Epic 2、限定=Epic 4）
- FR11: Epic 2 — 自動トランスコード・ストリーミング保存
- FR12: Epic 4 — 限定動画のACC付き暗号化保存
- FR13: Epic 2 — トランスコード失敗エラー表示
- FR14: Epic 2 — ストレージ残高不足エラー表示
- FR15: Epic 2 — アップロード動画一覧
- FR16: Epic 2 — Irysストレージ資金デポジット
- FR17: Epic 2 — 公開動画のログイン不要視聴
- FR18: Epic 4 — 限定動画の条件付き視聴
- FR19: Epic 4 — 限定動画復号処理の進捗・理由表示
- FR20: Epic 2 — 動画詳細情報閲覧
- FR21: Epic 3 — 投げ銭送信
- FR22: Epic 3 — 投げ銭プリセット額選択
- FR23: Epic 3 — オンチェーン到達確認表示
- FR24: Epic 3 — ブロックチェーンエクスプローラーリンク
- FR25: Epic 3 — クリエイター投げ銭受領通知
- FR26: Epic 3 — 投げ銭残高不足エラー表示
- FR27: Epic 4 — 限定動画ロック画面表示
- FR28: Epic 4 — アクセス条件・充足状況表示
- FR29: Epic 4 — 条件充足時の自動アクセス許可
- FR30: Epic 4 — 送信者・受信者双方の復号権限
- FR31: Epic 2 — 動画一覧閲覧
- FR32: Epic 2 — タグ・カテゴリフィルタリング
- FR33: Epic 2 — 公開/限定の識別表示
- FR34: Epic 2 — クリエイター別絞り込み
- FR35: Epic 1 — ウォレット残高確認
- FR36: Epic 5 — プロトコル実効コスト記録・参照
- FR37: Epic 5 — ステータスページリンク参照
- FR38: Epic 5 — E2Eテスト自動実行

## Epic List

### Epic 1: プラットフォーム基盤とユーザー認証
安全なプラットフォーム上で、ファン（Google/SNSログイン）とクリエイター（MetaMask）がシームレスにログインし、プロフィール・残高を確認できる。ブラウンフィールドの基盤整備（セキュリティ更新、型定義、サービス層DI、テスト基盤）を含む。
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR35

### Epic 2: 公開動画パイプライン（アップロード・再生・コンテンツ発見）
クリエイターが動画をアップロードし、誰でもログイン不要で検索・視聴できる。Livepeer TUS→トランスコード→Irys保存→HLS再生の公開動画パイプラインと、動画一覧・フィルタリング機能を含む。
**FRs covered:** FR7, FR8, FR9, FR10（公開部分）, FR11, FR13, FR14, FR15, FR16, FR17, FR20, FR31, FR32, FR33, FR34

### Epic 3: 投げ銭（P2Pダイレクト送金）
ファンがクリエイターに投げ銭を送り、100%が届いたことをオンチェーンで確認できる。VideoTippingコントラクト統合、プリセット額、到達確認UI、Polygonscanリンク、受領通知を含む。
**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26

### Epic 4: 限定動画（暗号化・アクセス制御・復号再生）
クリエイターが限定動画を公開し、条件を満たすファンだけが復号・視聴できる。Lit Protocol Naga移行（SDK v7→v8）、ACC暗号化、ロック画面、条件判定、プログレッシブ復号再生を含む。
**FRs covered:** FR10（限定部分）, FR12, FR18, FR19, FR27, FR28, FR29, FR30

### Epic 5: E2Eテスト・コスト計測・運用基盤
全パイプラインの品質が自動検証され、各プロトコルの運用コストが計測・記録される。Playwright E2E（4パイプライン）、[METRIC]構造化ログ、ステータスページリンク、PoC完了判定基盤を含む。
**FRs covered:** FR36, FR37, FR38

---

## Epic 1: プラットフォーム基盤とユーザー認証

安全なプラットフォーム上で、ファン（Google/SNSログイン）とクリエイター（MetaMask）がシームレスにログインし、プロフィール・残高を確認できる。

### Story 1.1: プロジェクト基盤のセキュリティ更新と開発環境整備

As a **開発者（stanah）**,
I want **プラットフォームのセキュリティ脆弱性を修正し、型安全な開発基盤を整備する**,
So that **安全かつ一貫したコードベース上で全機能の開発を進められる**.

**Acceptance Criteria:**

**Given** 現行のNext.js 16.0.8がCVE-2025-66478（CVSS 10.0）を含む状態
**When** Next.js 16.1.6 LTSにアップデートする
**Then** `pnpm build`が正常に完了し、既存機能が動作する
**And** アプリケーションシークレットのローテーションが完了している

**Given** 環境変数が型検証なしで使用されている状態
**When** `src/lib/config.ts`をZodスキーマバリデーションにリファクタする
**Then** 起動時にすべての必須環境変数が検証され、不足時に明確なエラーが出る
**And** `config.test.ts`が存在しテストが通る

**Given** サービス層の型定義が存在しない状態
**When** `types/errors.ts`（Result型、AppError）、`types/services.ts`（LitService、IrysService、LivepeerService、VideoService Interface）、`types/pipeline.ts`（PipelineStage、PipelineState、PipelineAction）を定義する
**Then** 全Interface定義が`pnpm build`を通過する

**Given** Provider合成のネスティングが深い状態
**When** `src/lib/compose-providers.tsx`を作成し`providers.tsx`に適用する
**Then** Provider構成が宣言的配列で管理される

**Given** テストフレームワークが未導入の状態
**When** Vitest 4.xとPlaywright 1.58.xを設定する
**Then** `vitest.config.ts`の`@/`エイリアスが`tsconfig.json`と同期し、サンプルテストが通る
**And** `playwright.config.ts`が存在し`npx playwright test --list`が正常動作する

### Story 1.2: AAログインでファンがソーシャルログインできる

As a **ファン（Web3初心者）**,
I want **GoogleアカウントやPasskeyでログインする**,
So that **MetaMaskなしで3ステップ以内にプラットフォームを利用開始できる**.

**Acceptance Criteria:**

**Given** 未ログインのユーザーがトップページにアクセスした状態
**When** ログインボタンを押してGoogleアカウントで認証する
**Then** 3ステップ以内（ログイン→プロフィール確認→利用開始）でオンボーディングが完了する
**And** AA（permissionless.js + Pimlico）経由でスマートアカウントが作成される

**Given** Privy SDKが統合された状態
**When** Passkeyでログインを試みる
**Then** WebAuthnフローが完了し、スマートアカウントが利用可能になる

**Given** AAログイン中にAlchemy/Privy側でエラーが発生した状態
**When** アカウント作成に失敗する
**Then** 「アカウント作成に失敗しました」エラーメッセージが表示される
**And** 「MetaMaskでログイン」への代替手段リンクが提示される（FR5）

**Given** ServiceContext（DI）が設定された状態
**When** WalletContextがAAウォレットを初期化する
**Then** 統一Walletインターフェース経由でウォレットアドレスが取得できる
**And** ウォレット秘密鍵がサーバー側に送信されない（NFR-S1）

### Story 1.3: MetaMaskウォレット接続でクリエイターがログインできる

As a **クリエイター（Web3ネイティブ）**,
I want **MetaMaskウォレットで直接接続する**,
So that **既存のウォレットを使ってすぐにプラットフォームを利用できる**.

**Acceptance Criteria:**

**Given** MetaMask拡張がインストールされたブラウザで未ログインの状態
**When** 「MetaMaskで接続」ボタンを押す
**Then** MetaMaskの接続承認ポップアップが表示される
**And** 承認後、Viem経由でウォレットが接続されWalletContextに状態が反映される

**Given** MetaMaskが未インストールのブラウザ
**When** 「MetaMaskで接続」ボタンを押す
**Then** MetaMaskインストールへの案内が表示される

**Given** MetaMaskが接続済みの状態
**When** 統一Walletインターフェース経由でウォレット情報を取得する
**Then** AA接続時と同一のインターフェースでアドレス取得・トランザクション署名が可能
**And** コンポーネント層が認証方式（AA/MetaMask）を意識しない

### Story 1.4: プロフィール確認・残高表示・ログアウト

As a **ログイン済みユーザー**,
I want **自分のプロフィール情報と残高を確認し、ログアウトできる**,
So that **アカウント状態を把握し、セッションを安全に終了できる**.

**Acceptance Criteria:**

**Given** ログイン済みの状態
**When** プロフィール画面にアクセスする
**Then** ウォレットアドレスが表示される（FR4）
**And** 接続方式（AA/MetaMask）が識別できる

**Given** ログイン済みの状態
**When** ウォレット残高表示エリアを確認する
**Then** Polygon Amoyテストネット上の残高がETH単位で表示される（FR35）

**Given** ログイン済みの状態
**When** ログアウトボタンを押す
**Then** ウォレット接続が解除され、未ログイン状態に戻る（FR6）
**And** WalletContextの状態がクリアされる
**And** Litセッション署名がクリアされる（NFR-S6）

---

## Epic 2: 公開動画パイプライン（アップロード・再生・コンテンツ発見）

クリエイターが動画をアップロードし、誰でもログイン不要で検索・視聴できる。

### Story 2.1: 動画アップロードフォームとLivepeer TUSアップロード

As a **クリエイター**,
I want **動画ファイルを選択し、メタデータを入力してアップロードを開始する**,
So that **自分のコンテンツをプラットフォームに投稿する最初のステップを実行できる**.

**Acceptance Criteria:**

**Given** ログイン済みクリエイターがアップロードページにアクセスした状態
**When** 動画ファイルを選択し、タイトル・説明・カテゴリ・アクセスタイプ（公開）を入力して「アップロード」を押す
**Then** Livepeer TUSプロトコル経由でアップロードが開始される（FR7, FR8, FR10）
**And** `uploadPipelineReducer`がidle→preparing→uploadingとステージ遷移する

**Given** アップロード中の状態
**When** 転送が進行する
**Then** アップロード進捗がプログレスバーとパーセンテージで表示される（FR9）
**And** `[METRIC] event=upload_progress`がコンソールに出力される

**Given** アップロード中の状態
**When** ユーザーがキャンセルを押す
**Then** AbortSignalによりTUSアップロードが中止される
**And** パイプラインがcancelling→idleに遷移する

**Given** LivepeerServiceImplが初期化された状態
**When** サービスメソッドを呼び出す
**Then** Result型で結果が返される（throwしない）
**And** タイムアウトが30秒に設定されている（NFR-I3）

### Story 2.2: トランスコードとIrysへの保存

As a **クリエイター**,
I want **アップロードした動画が自動的にトランスコードされ、永続ストレージに保存される**,
So that **HLSストリーミング形式で誰でも視聴できる状態になる**.

**Acceptance Criteria:**

**Given** TUSアップロードが完了した状態
**When** Livepeerが自動的にトランスコード処理を行う
**Then** パイプラインがuploading→transcodingに遷移し、トランスコード進捗が表示される（FR11）
**And** `usePipelineOrchestrator`がポーリングでトランスコード完了を監視する

**Given** トランスコードが完了した状態
**When** HLSセグメントが準備完了する
**Then** パイプラインがtranscoding→storingに遷移する
**And** IrysServiceImplがメタデータ（タイトル、説明、カテゴリ、アクセスタイプ、Creator）と動画データをIrysに保存する
**And** IrysタグはPascalCase（`AppName`, `AccessType`, `Creator`等）で設定される

**Given** トランスコードが失敗した状態
**When** サポートされていないフォーマットの動画がアップロードされた
**Then** 「トランスコードに失敗しました」とサポート形式（MP4 H.264, WebM, MOV）が表示される（FR13）
**And** パイプラインがfailed状態に遷移し、AppError（category: 'livepeer', retryable: false）が設定される

**Given** Irysストレージ残高が不足している状態
**When** 保存を試みる
**Then** 「ストレージ残高が不足しています」と必要額・現在残高が表示される（FR14）
**And** 「残高を追加」リンクが提示される

**Given** パイプライン全体が完了した状態
**When** storing→completedに遷移する
**Then** `[METRIC] event=upload_complete, duration_ms=X, video_type=public`がログ出力される（NFR-P5）

### Story 2.3: Irysデポジットとクリエイター動画一覧

As a **クリエイター**,
I want **Irysストレージに資金をデポジットし、自分の動画一覧を確認する**,
So that **動画保存のための残高を管理し、公開状況を把握できる**.

**Acceptance Criteria:**

**Given** ログイン済みクリエイターがデポジットページにアクセスした状態
**When** デポジット額を入力して実行する
**Then** Irysストレージに資金がデポジットされる（FR16）
**And** 残高が更新表示される

**Given** ログイン済みクリエイターの状態
**When** マイ動画一覧ページにアクセスする
**Then** Irys GraphQL経由で自分がアップロードした動画一覧が表示される（FR15）
**And** 各動画のタイトル、アクセスタイプ（公開/限定）、アップロード日時が表示される

**Given** Irys GraphQLエンドポイントが環境変数で設定されている状態
**When** クエリを実行する
**Then** 環境変数`IRYS_GRAPHQL_ENDPOINT`の値が使用される（NFR-I4）

### Story 2.4: 公開動画のHLS再生

As a **ユーザー（ログイン不要）**,
I want **公開動画をブラウザ上でシームレスに視聴する**,
So that **ログインやウォレット接続なしでコンテンツを楽しめる**.

**Acceptance Criteria:**

**Given** 公開動画の視聴ページにアクセスした状態（ログイン不要）
**When** ページが読み込まれる
**Then** Irys Gateway経由でHLSマニフェストが取得され、hls.jsが再生を開始する（FR17）
**And** 再生開始時間が1秒以内である（NFR-P1、ブロードバンド環境）
**And** `[METRIC] event=playback_start, duration_ms=X, video_type=public`がログ出力される

**Given** 動画再生ページの状態
**When** 動画情報エリアを確認する
**Then** タイトル、説明、クリエイター情報（アドレス）が表示される（FR20）

**Given** Livepeerが障害中の状態
**When** Irysに既に保存済みの公開動画を視聴する
**Then** 正常に再生される（NFR-I6 — Livepeer障害は新規アップロードのみブロック）

### Story 2.5: 動画一覧とタグ・カテゴリフィルタリング

As a **ユーザー**,
I want **プラットフォーム上の動画を一覧で閲覧し、タグやカテゴリで絞り込む**,
So that **興味のあるコンテンツを効率的に見つけられる**.

**Acceptance Criteria:**

**Given** トップページにアクセスした状態
**When** ページが読み込まれる
**Then** 公開動画の一覧がカード形式で表示される（FR31）
**And** 各カードに公開/限定の区別バッジが表示される（FR33）

**Given** 動画一覧が表示された状態
**When** カテゴリフィルターを選択する
**Then** 選択したカテゴリの動画のみが表示される（FR32）
**And** Irys GraphQLのタグフィルタリングが使用される

**Given** 動画一覧が表示された状態
**When** クリエイターアドレスで絞り込む（チャンネルページアクセス）
**Then** そのクリエイターの動画のみが表示される（FR34）

### Story 2.6: アップロードパイプラインのエラーハンドリングとリトライ

As a **クリエイター**,
I want **アップロード中のエラーから適切にリカバリーできる**,
So that **問題発生時も動画公開を完了できる**.

**Acceptance Criteria:**

**Given** アップロード中にネットワークエラーが発生した状態
**When** パイプラインがfailed状態になる
**Then** AppErrorにretryable: trueが設定されている場合「再試行」ボタンが表示される
**And** `RETRY_FROM_STAGE`ディスパッチで失敗したステージから再開できる

**Given** 各ステージでエラーが発生した状態
**When** エラーメッセージが表示される
**Then** 外部プロトコルのエラーがユーザーに理解可能な日本語メッセージに変換されている（NFR-I5）
**And** AppError.categoryでプロトコル別にエラーが分類されている

**Given** uploading ステージで失敗した場合
**When** リトライを実行する
**Then** TUS resumable uploadにより中断地点から再開される

**Given** encrypting ステージは公開動画パイプラインに存在しない
**When** 公開動画のアップロードを行う
**Then** パイプラインはidle→preparing→uploading→transcoding→storing→completedで完了する（encryptingをスキップ）

---

## Epic 3: 投げ銭（P2Pダイレクト送金）

ファンがクリエイターに投げ銭を送り、100%が届いたことをオンチェーンで確認できる。

### Story 3.1: 投げ銭の送信と100%到達確認

As a **ファン**,
I want **クリエイターに投げ銭を送信し、100%届いたことをオンチェーンで確認する**,
So that **推しクリエイターを直接支援し、全額が届いた実感を得られる**.

**Acceptance Criteria:**

**Given** 動画再生ページにログイン済みファンがアクセスした状態
**When** TippingWidgetでプリセット額（例: 0.001 ETH, 0.005 ETH, 0.01 ETH）から選択し「送信」を押す
**Then** VideoTippingコントラクト経由でP2P直接送金トランザクションが送信される（FR21, FR22）
**And** スマートコントラクトが意図した送金先（クリエイターアドレス）以外に資金を送らない（NFR-S3）

**Given** トランザクションが送信された状態
**When** ブロックチェーン上で確認処理中
**Then** ローディングUI「⏳ トランザクションを処理しています... ブロックチェーンに記録中です」が表示される
**And** 待機時間の理由（ブロック確認プロセス）が教育的に伝えられる

**Given** トランザクションがオンチェーンで確認された状態
**When** 確認イベントを受信する
**Then** 「✅ {クリエイター名} に {金額} ETH が届きました」と確認画面が表示される（FR23）
**And** Polygonscanのトランザクション詳細へのリンクが表示される（FR24）
**And** `[METRIC] event=tipping_confirmed, duration_ms=X, amount_eth=Y`がログ出力される（NFR-P4）

**Given** トランザクション送信後にネットワークが切断された状態
**When** 確認を受信できない
**Then** 「送信済み・未確認」の状態がユーザーに明示される（NFR-R2）
**And** トランザクションハッシュとPolygonscanリンクが表示され、手動確認が可能

### Story 3.2: 投げ銭の残高不足エラーと受領通知

As a **ファン**,
I want **残高不足時に明確なエラーと対処法を確認できる**,
So that **送金できない状況でも次のアクションが分かる**.

As a **クリエイター**,
I want **投げ銭を受け取った際に通知を受ける**,
So that **ファンからの支援を即座に把握できる**.

**Acceptance Criteria:**

**Given** ウォレット残高が投げ銭額+ガス代より少ない状態
**When** 投げ銭送信を試みる
**Then** 「残高が不足しています」と必要額・現在残高が表示される（FR26）
**And** 残高追加方法への案内リンク（テストネットFaucet / 本番オンランプ）が表示される

**Given** 投げ銭トランザクションがオンチェーンで確認された状態
**When** クリエイターが同じプラットフォームにログインしている
**Then** ページ内通知「🎉 {ファン名}さんから {金額} ETH の投げ銭を受け取りました」が表示される（FR25）

**Given** クリエイターが動画詳細ページを閲覧中の状態
**When** その動画に対して投げ銭が行われる
**Then** 投げ銭受領がリアルタイムに反映される（ページ内通知。WebSocket/SSEはP1スコープ）

### Story 3.3: 初回投げ銭の教育的体験

As a **初めて投げ銭するファン**,
I want **「なぜ100%届くのか」を理解した上で安心して送金する**,
So that **プラットフォームの価値を実感し、継続的な支援のきっかけになる**.

**Acceptance Criteria:**

**Given** ファンが初めて投げ銭しようとしている状態（投げ銭履歴なし）
**When** TippingWidgetを表示する
**Then** 少額プリセット（0.001 ETH ≈ 数百円）が最上位に表示される
**And** 「投げ銭は100%クリエイターに届きます。プラットフォーム手数料はゼロです」の簡潔な説明が表示される

**Given** 初回投げ銭が成功した状態
**When** 確認画面が表示される
**Then** 到達確認を丁寧に演出し、Polygonscanリンクで透明性を体感させる
**And** 「累計支援額」の初期値が表示される

**Given** 2回目以降の投げ銭の状態（投げ銭履歴あり）
**When** TippingWidgetを表示する
**Then** 教育的説明は省略され、プリセット1タップ→送信の簡潔なUIが表示される
**And** 累計支援額の成長が表示される

---

## Epic 4: 限定動画（暗号化・アクセス制御・復号再生）

クリエイターが限定動画を公開し、条件を満たすファンだけが復号・視聴できる。

### Story 4.1: Lit Protocol Naga移行（SDK v7→v8）

As a **開発者（stanah）**,
I want **Lit Protocol SDKをv7（Datil）からv8（Naga）に移行する**,
So that **Nagaネットワーク上で暗号化・復号が動作し、限定動画機能の前提条件を満たせる**.

**Acceptance Criteria:**

**Given** 現行の@lit-protocol/* v7.3.1がDatilDevネットワークに接続している状態
**When** @lit-protocol/* v8.x（Naga）にアップデートする
**Then** `src/lib/lit.ts`と`src/lib/encryption.ts`の2ファイルのみが変更対象である
**And** `pnpm build`が正常に完了する

**Given** Naga SDK v8が導入された状態
**When** LitServiceImpl.create()でNagaネットワークに接続する
**Then** Result型で接続結果が返される（ファクトリパターン）
**And** タイムアウトが60秒に設定されている（NFR-I3）

**Given** Naga SDK v8の暗号化機能が利用可能な状態
**When** テストデータをACC条件付きで暗号化→復号する
**Then** 暗号化と復号が正常に動作する
**And** `lit.test.ts`でNaga暗号化/復号のユニットテストが通る

**Given** DatilDev（v7）で暗号化されたデータ
**When** Naga（v8）で復号を試みる
**Then** DKG差異により復号が不可能であることが確認される（既知の制約）

### Story 4.2: 限定動画の暗号化アップロード

As a **クリエイター**,
I want **動画を「限定」としてアップロードし、アクセス条件を設定する**,
So that **特定の条件を満たすファンだけが視聴できる限定コンテンツを公開できる**.

**Acceptance Criteria:**

**Given** ログイン済みクリエイターがアップロードページでアクセスタイプ「限定」を選択した状態
**When** 動画のアップロードとトランスコードが完了する
**Then** パイプラインにencryptingステージが追加される（idle→preparing→uploading→transcoding→encrypting→storing→completed）
**And** LitServiceImplがACC条件付きでHLSセグメントを暗号化する（FR12）

**Given** ACC条件を設定する際
**When** クリエイターが限定動画を公開する
**Then** OR条件パターン（送信者アドレス OR 受信者アドレスが復号可能）が自動設定される（FR30）
**And** クリエイター自身も復号可能であることが保証される

**Given** 暗号化が完了した状態
**When** Irysに保存する
**Then** メタデータにAccessType: "restricted"タグが設定される（FR10 限定部分）
**And** 暗号化データと暗号化メタデータがIrysに永続保存される

**Given** encryptingステージ中にLitセッションが期限切れの状態
**When** 暗号化を実行する
**Then** 再認証が要求される（AppError: category 'lit', code 'SESSION_EXPIRED', retryable: true）

### Story 4.3: 限定動画のロック画面とアクセス条件表示

As a **ファン**,
I want **限定動画のアクセス条件と自分の充足状況を確認できる**,
So that **何をすれば視聴できるかを理解し、条件を満たすモチベーションを得られる**.

**Acceptance Criteria:**

**Given** 条件を満たさないユーザーが限定動画ページにアクセスした状態
**When** ページが読み込まれる
**Then** プレーヤーの代わりにロック画面「🔒 この動画は限定公開です」が表示される（FR27）
**And** アクセス条件（例: 「TechMaster Kenに0.05 ETH以上の投げ銭履歴がある」）が表示される（FR28）
**And** 現在の充足状況（例: 「❌ 条件を満たしていません / 現在の投げ銭累計: 0.01 ETH」）が表示される

**Given** 条件を満たさないユーザーの状態
**When** 「投げ銭して条件を満たす」リンクを押す
**Then** TippingWidgetに遷移し、不足額を補う投げ銭が可能

**Given** ユーザーが条件を満たした状態（投げ銭累計が閾値到達）
**When** 条件充足がオンチェーンで確認される
**Then** 自動的にアクセスが許可される（FR29）
**And** 「✅ 視聴条件を満たしました！」が表示される

**Given** Lit Protocol障害中の状態
**When** 公開動画ページにアクセスする
**Then** 公開動画は正常に再生される（NFR-I2 — Lit障害は限定動画のみ影響）

### Story 4.4: 限定動画のプログレッシブ復号再生

As a **条件を満たしたファン**,
I want **限定動画をスムーズに視聴する**,
So that **特別なコンテンツへのアクセスという「特別感」を楽しめる**.

**Acceptance Criteria:**

**Given** アクセス条件を満たしたユーザーが限定動画ページにアクセスした状態
**When** 復号処理が開始される
**Then** 「🔓 コンテンツを復号化しています... あなたのウォレットで安全に視聴できるよう準備中です」とローディングUIが表示される（FR19）
**And** 復号が「何をしているか」「なぜ安全か」を教育的に伝える

**Given** hls.jsカスタムローダーが設定された状態
**When** 最初のHLSセグメントの復号が完了する
**Then** 全セグメントの復号完了を待たず即座に再生が開始される（プログレッシブ復号）
**And** 再生開始時間が3秒以内である（NFR-P2、ブロードバンド環境）
**And** `[METRIC] event=playback_start, duration_ms=X, video_type=restricted`がログ出力される

**Given** 送信者（クリエイター）が自分の限定動画にアクセスした状態
**When** 復号を実行する
**Then** ACC OR条件により、クリエイター自身も正常に復号・視聴できる（FR30）

**Given** Litセッション署名が必要な状態
**When** 復号のためにセッションを取得する
**Then** セッション署名はクライアントサイドのメモリ内キャッシュのみで管理される（NFR-S6）
**And** ACC条件を満たすウォレットのみが復号可能である（NFR-S2）

---

## Epic 5: E2Eテスト・コスト計測・運用基盤

全パイプラインの品質が自動検証され、各プロトコルの運用コストが計測・記録される。

### Story 5.1: 主要パイプラインのE2Eテスト

As a **運営者（stanah）**,
I want **公開動画・限定動画・投げ銭・AA認証の4パイプラインをE2Eテストで自動検証する**,
So that **リグレッションを早期検出し、PoC完了判定の「E2Eテストフレームワーク稼働」基準を満たせる**.

**Acceptance Criteria:**

**Given** Playwright E2E環境がStory 1.1で構築済みの状態
**When** 公開動画E2Eテスト（`tests/e2e/public-video-upload.spec.ts`）を実行する
**Then** アップロード→トランスコード→Irys保存→HLS再生のフローが正常完了する（FR38）

**Given** E2E環境の状態
**When** 限定動画E2Eテスト（`tests/e2e/restricted-video.spec.ts`）を実行する
**Then** ACC暗号化→ロック画面→条件充足→復号→再生のフローが正常完了する

**Given** E2E環境の状態
**When** 投げ銭E2Eテスト（`tests/e2e/tipping.spec.ts`）を実行する
**Then** プリセット選択→送信→オンチェーン確認→到達表示のフローが正常完了する

**Given** E2E環境の状態
**When** ウォレット接続E2Eテスト（`tests/e2e/wallet-connect.spec.ts`）を実行する
**Then** AA認証およびMetaMask接続のフローが正常完了する

**Given** テストデータがIrys上に存在する状態
**When** テストを実行する
**Then** テスト用タグプレフィックス`AppName: "DecentralizedVideo-Test"`で本番データと分離されている

**Given** すべてのE2Eテストが通過した状態
**When** `npx playwright test`を実行する
**Then** 4パイプライン全テストがグリーンである（NFR-R3）

### Story 5.2: コスト計測インストルメンテーションと記録

As a **運営者（stanah）**,
I want **各プロトコルの実効コストを計測・記録する**,
So that **PoC完了判定の「コスト内訳が実測値として記録されている」基準を満たし、運用コストの把握ができる**.

**Acceptance Criteria:**

**Given** 動画アップロードが完了した状態
**When** ブラウザDevToolsで`[METRIC]`フィルタリングする
**Then** 以下のコスト関連メトリクスが記録されている（FR36）：
- `[METRIC] event=irys_upload, size_bytes=X, cost_atomic=Y, duration_ms=Z`
- `[METRIC] event=livepeer_transcode, duration_ms=X, video_length_sec=Y`
- `[METRIC] event=upload_complete, duration_ms=X, video_type=Y`（NFR-P5）

**Given** 限定動画を再生した状態
**When** DevToolsでログを確認する
**Then** Lit復号コストが記録されている：
- `[METRIC] event=lit_decrypt, segments=X, duration_ms=Y`
- `[METRIC] event=playback_start, duration_ms=X, video_type=restricted`（NFR-P2検証用）

**Given** 投げ銭が完了した状態
**When** DevToolsでログを確認する
**Then** 投げ銭確認時間が記録されている：
- `[METRIC] event=tipping_confirmed, duration_ms=X, amount_eth=Y`（NFR-P4）

**Given** すべてのメトリクスが`[METRIC]`プレフィックス + key=value形式で出力される状態
**When** DevToolsからコピーする
**Then** CSV変換が容易で、コスト分析スプレッドシートに貼り付け可能である

### Story 5.3: ステータスページリンクとPoC完了判定チェックリスト

As a **運営者（stanah）**,
I want **外部プロトコルのステータスを確認でき、PoC完了判定を体系的に実行できる**,
So that **障害時の対応が迅速に行え、PoC成功/失敗を明確に判定できる**.

**Acceptance Criteria:**

**Given** 運営者がプラットフォームを管理する状態
**When** ステータスページリンク集を参照する
**Then** 以下のリンクが確認可能である（FR37）：
- Lit Protocol: https://status.litprotocol.com/
- Livepeer: https://livepeer.statuspage.io/
- Irys: https://status.irys.xyz/

**Given** PoC完了判定を行う状態
**When** Measurable Outcomesの6項目をチェックする
**Then** 以下の判定が可能である：
1. 公開動画10本以上のアップロード・再生確認（E2E + 手動）
2. 限定動画の暗号化→復号→再生フロー動作確認（E2E）
3. AA経由のオンボーディングフロー動作確認（E2E）
4. 投げ銭のオンチェーン到達確認（E2E）
5. 各プロトコルの実効コスト記録済み（`[METRIC]`ログ）
6. E2Eテストフレームワーク稼働・主要フローテスト通過（Playwright）
