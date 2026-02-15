# Story 2.6: アップロードパイプラインのエラーハンドリングとリトライ

Status: done

## Story

As a **クリエイター**,
I want **アップロード中のエラーから適切にリカバリーできる**,
so that **問題発生時も動画公開を完了できる**.

## Acceptance Criteria (BDD)

### AC1: retryable AppErrorでの再試行

**Given** アップロード中にネットワークエラーが発生した状態
**When** パイプラインがfailed状態になる
**Then** AppErrorにretryable: trueが設定されている場合「再試行」ボタンが表示される
**And** `RETRY_FROM_STAGE`ディスパッチで失敗したステージから再開できる

### AC2: 日本語エラーメッセージへの統一変換

**Given** 各ステージでエラーが発生した状態
**When** エラーメッセージが表示される
**Then** 外部プロトコルのエラーがユーザーに理解可能な日本語メッセージに変換されている（NFR-I5）
**And** AppError.categoryでプロトコル別にエラーが分類されている

### AC3: TUS resumable uploadの中断地点からの再開

**Given** uploadingステージで失敗した場合
**When** リトライを実行する
**Then** TUS resumable uploadにより中断地点から再開される

### AC4: 公開動画パイプラインのencryptingスキップ

**Given** encryptingステージは公開動画パイプラインに存在しない
**When** 公開動画のアップロードを行う
**Then** パイプラインはidle→preparing→uploading→transcoding→storing→completedで完了する（encryptingをスキップ）

## Tasks / Subtasks

- [ ] **Task 1: uploadPipelineReducerの状態遷移ガード追加** (AC: #1)
  - [ ] 1.1 `src/lib/pipeline-reducer.ts`を更新
  - [ ] 1.2 `STAGE_START`ガード: completed/cancelling状態からのSTAGE_STARTを拒否
  - [ ] 1.3 `STAGE_COMPLETE`ガード: idle/failed/cancelling状態からのSTAGE_COMPLETEを拒否
  - [ ] 1.4 `RETRY_FROM_STAGE`ガード: failed状態からのみ許可（他の状態からは拒否）
  - [ ] 1.5 `CANCEL`ガード: idle/completed/failed状態からのCANCELを拒否
  - [ ] 1.6 不正遷移時は`console.warn`で警告ログ出力 + 現在のstateをそのまま返却
  - [ ] 1.7 `RETRY_FROM_STAGE`時: `error`をnull化、`retryCount`をインクリメント

- [ ] **Task 2: pipeline-reducerテスト強化** (AC: #1)
  - [ ] 2.1 `src/lib/pipeline-reducer.test.ts`を更新
  - [ ] 2.2 不正遷移テスト: completed→STAGE_STARTが無視される
  - [ ] 2.3 不正遷移テスト: idle→RETRY_FROM_STAGEが無視される
  - [ ] 2.4 不正遷移テスト: completed→CANCELが無視される
  - [ ] 2.5 正常リトライテスト: failed→RETRY_FROM_STAGE→指定ステージに遷移
  - [ ] 2.6 retryCount増加テスト: 連続リトライでカウントが増加
  - [ ] 2.7 RETRY_FROM_STAGE時error null化テスト

- [ ] **Task 3: usePipelineOrchestratorにリトライ機能追加** (AC: #1, #3)
  - [ ] 3.1 `src/hooks/usePipelineOrchestrator.ts`を更新
  - [ ] 3.2 `retryUpload()`: 失敗したステージから再開するメソッド追加
  - [ ] 3.3 リトライ時: 新しいAbortController生成、dispatch(RETRY_FROM_STAGE, lastFailedStage)
  - [ ] 3.4 ステージ別リトライ実装:
    - `preparing`: createAsset()から再実行
    - `uploading`: TUS resumable upload再開（後述）
    - `transcoding`: waitForReady()ポーリング再開
    - `storing`: Irysアップロード再実行
  - [ ] 3.5 最大リトライ回数: 3回（`MAX_RETRY_COUNT = 3`）。超過時はretryable: falseとして表示
  - [ ] 3.6 戻り値に`retryUpload`を追加

- [ ] **Task 4: TUS resumable upload再開対応** (AC: #3)
  - [ ] 4.1 `src/hooks/usePipelineOrchestrator.ts`にTUSリジューム状態保持
  - [ ] 4.2 `tusUploadRef`でtus.Uploadインスタンスを保持（リトライ時に再利用）
  - [ ] 4.3 `uploadingリトライ`時: `tusUploadRef.current`が存在すれば`upload.start()`で再開（中断地点から）
  - [ ] 4.4 `tusUploadRef.current`が存在しない場合: 新規TUSアップロードを開始
  - [ ] 4.5 tus-js-clientのresumable機能: `tus.Upload`は内部的にURLキャッシュで中断地点を記憶する
  - [ ] 4.6 LivepeerServiceImplの`uploadWithTus`にtus.Uploadインスタンス返却オプション追加

- [ ] **Task 5: AppErrorマッピング統一** (AC: #2)
  - [ ] 5.1 `src/lib/error-messages.ts`を新規作成
  - [ ] 5.2 プロトコル別エラーコード→日本語メッセージのマッピング定義
  - [ ] 5.3 `getErrorMessage(error: AppError): string`関数: category + codeに基づく日本語メッセージ返却
  - [ ] 5.4 `getErrorAction(error: AppError): { label: string; action: string } | null`関数: エラー種別に応じたアクションボタン情報返却
  - [ ] 5.5 全AppErrorコードの日本語メッセージ定義（下記参照）

- [ ] **Task 6: PipelineErrorDisplayコンポーネント作成** (AC: #1, #2)
  - [ ] 6.1 `src/components/video/PipelineErrorDisplay.tsx`を新規作成
  - [ ] 6.2 AppErrorの`message`を表示（日本語メッセージ）
  - [ ] 6.3 `retryable: true`の場合: 「再試行」ボタン表示
  - [ ] 6.4 `retryable: false`の場合: エラー種別に応じた代替アクション表示
    - `INSUFFICIENT_FUNDS`: 「残高を追加」ボタン（デポジットページへ遷移）
    - `TRANSCODE_FAILED`: 「別の形式で再アップロード」ボタン
    - `API_KEY_MISSING`: 設定確認の案内
  - [ ] 6.5 `retryCount`表示: 「再試行 (X/3回目)」
  - [ ] 6.6 最大リトライ超過時: 「再試行回数の上限に達しました。最初からやり直してください」

- [ ] **Task 7: VideoUploaderのエラーUI統合** (AC: #1, #2, #4)
  - [ ] 7.1 `src/components/video/VideoUploader.tsx`を更新
  - [ ] 7.2 `PipelineErrorDisplay`コンポーネント統合
  - [ ] 7.3 `usePipelineOrchestrator().retryUpload`をリトライボタンに接続
  - [ ] 7.4 公開動画パス確認: encryptingステージがスキップされることをUI上で明確に（ステージ一覧からencryptingを除外）
  - [ ] 7.5 キャンセルの改善: `cancelUpload`後のRESETをsetTimeoutではなくサービス応答ベースに

- [ ] **Task 8: cancelUpload改善** (AC: #1)
  - [ ] 8.1 `usePipelineOrchestrator`の`cancelUpload`を改善
  - [ ] 8.2 現行の`setTimeout(() => dispatch({ type: 'RESET' }), 500)`を廃止
  - [ ] 8.3 AbortController.abort()後、各サービスのPromise解決を待ってからRESETをdispatch
  - [ ] 8.4 cancelling状態のUI表示: 「キャンセル中...」メッセージ

- [ ] **Task 9: error-messagesテスト** (AC: #2)
  - [ ] 9.1 `src/lib/error-messages.test.ts`を新規作成
  - [ ] 9.2 全AppErrorコードに対して日本語メッセージが返されることを検証
  - [ ] 9.3 未知のコードに対してデフォルトメッセージが返されることを検証
  - [ ] 9.4 getErrorActionのプロトコル別アクション検証

- [ ] **Task 10: 最終検証** (AC: #1-4)
  - [ ] 10.1 `pnpm build` — ゼロエラー
  - [ ] 10.2 `pnpm test` — 全テストパス
  - [ ] 10.3 `pnpm lint` — 変更ファイルゼロ警告
  - [ ] 10.4 `pnpm dev`で手動動作確認:
    - アップロード中にネットワーク切断→エラー表示→リトライボタン→再開
    - 公開動画パイプライン: encryptingステージが表示されない
    - エラーメッセージが日本語で表示される
    - 3回リトライ超過後に「上限到達」メッセージ表示

## Dev Notes

### 実装順序（依存関係に基づく）

**必ずこの順序で実装すること：**
1. **Task 1 (pipeline-reducerガード)** — リトライの基盤。pure関数の変更のみ
2. **Task 2 (reducerテスト)** — Task 1直後にテスト
3. **Task 5 (error-messages)** — 独立タスク（Task 1と並行可能）
4. **Task 9 (error-messagesテスト)** — Task 5直後にテスト
5. **Task 4 (TUS再開)** — Task 3の前提。LivepeerServiceImplの拡張
6. **Task 3 (usePipelineOrchestrator拡張)** — Task 1 + Task 4に依存
7. **Task 8 (cancelUpload改善)** — Task 3に依存
8. **Task 6 (PipelineErrorDisplay)** — Task 5に依存
9. **Task 7 (VideoUploader統合)** — Task 3 + Task 6に依存
10. **Task 10 (最終検証)** — 全タスク完了後

### Story 2.1-2.5への依存関係（前提条件）

**前提ストーリーで実装済みの基盤：**

| コンポーネント | ファイル | 状態 |
|--------------|--------|------|
| `uploadPipelineReducer` | `src/lib/pipeline-reducer.ts` | Story 2.1で実装済み。**本ストーリーでガード追加** |
| `usePipelineOrchestrator` | `src/hooks/usePipelineOrchestrator.ts` | Story 2.2で完全パイプライン実装済み。**本ストーリーでリトライ追加** |
| `LivepeerServiceImpl` | `src/lib/livepeer.ts` | Story 2.1でResult型化・AbortSignal対応済み |
| `IrysServiceImpl` | `src/lib/irys.ts` | Story 2.2でResult型化済み |
| `ServiceContext` | `src/contexts/ServiceContext.tsx` | Livepeer + Irys注入済み |
| `TranscodeProgress` | `src/components/video/TranscodeProgress.tsx` | PipelineState対応済み |
| `VideoUploader` | `src/components/video/VideoUploader.tsx` | usePipelineOrchestrator統合済み |
| 型定義 | `src/types/errors.ts` | AppError, ErrorCategory, Result<T> |
| 型定義 | `src/types/pipeline.ts` | PipelineStage, PipelineState, PipelineAction（RETRY_FROM_STAGE含む） |

### Architecture Compliance（必須遵守ルール）

**命名規則:**
- 新規ファイル: `error-messages.ts`（camelCase）
- 新規コンポーネント: `PipelineErrorDisplay.tsx`（PascalCase）
- テストファイル: `.test.ts`（コロケーション）

**Result型パターン（全サービス層共通）:**
- サービス層は`throw`禁止。`Result<T>`を返す
- エラー情報は`AppError`型で統一

**Reducerアクション型（`src/types/pipeline.ts`定義済み — 変更禁止）:**
```typescript
type PipelineAction =
  | { type: 'STAGE_START'; stage: PipelineStage }
  | { type: 'STAGE_COMPLETE'; stage: PipelineStage }
  | { type: 'PROGRESS_UPDATE'; stage: PipelineStage; progress: number; message: string }
  | { type: 'STAGE_FAILED'; error: AppError }
  | { type: 'RETRY_FROM_STAGE'; stage: PipelineStage }
  | { type: 'CANCEL' }
  | { type: 'RESET' };
```

**ステージ別リトライ可否（architecture.md準拠）:**

| ステージ | リトライ可否 | 理由 |
|---------|------------|------|
| preparing | 可 | 冪等操作 |
| uploading | 可 | TUS resumable upload対応 |
| transcoding | 不可（待機のみ） | Livepeer側処理。ポーリング再開のみ |
| encrypting | 要再認証 | Litセッション有効期限切れの可能性（Story 4.2で実装） |
| storing | 可 | Irysアップロードは冪等 |

**構造化ログフォーマット:**
```
[METRIC] event=pipeline_retry, stage=uploading, retry_count=1, timestamp=Z
[METRIC] event=pipeline_error, stage=transcoding, error_code=TRANSCODE_FAILED, retryable=false, timestamp=Z
```

### Technical Requirements

#### Task 1: uploadPipelineReducerガード

**現行コード（`src/lib/pipeline-reducer.ts`）の問題:**
- 全アクションを無条件に受理する（不正遷移のガードなし）
- `completed`状態から`STAGE_START`が可能（意図しないパイプライン再開）
- Story 2.1のDev Notesで「不正遷移ガードはStory 2.6で追加」と明記

**ガード実装方針:**

```typescript
export function uploadPipelineReducer(
  state: PipelineState,
  action: PipelineAction
): PipelineState {
  switch (action.type) {
    case 'STAGE_START': {
      // completed/cancellingからの遷移を拒否
      if (state.stage === 'completed' || state.stage === 'cancelling') {
        console.warn(`[Pipeline] Invalid transition: ${state.stage} → STAGE_START(${action.stage})`);
        return state;
      }
      return { ...state, stage: action.stage, progress: 0, message: '', error: null };
    }

    case 'STAGE_COMPLETE': {
      // idle/failed/cancellingからの完了を拒否
      if (state.stage === 'idle' || state.stage === 'failed' || state.stage === 'cancelling') {
        console.warn(`[Pipeline] Invalid transition: ${state.stage} → STAGE_COMPLETE(${action.stage})`);
        return state;
      }
      return { ...state, lastCompletedStage: action.stage, progress: 100 };
    }

    case 'RETRY_FROM_STAGE': {
      // failed状態からのみリトライ許可
      if (state.stage !== 'failed') {
        console.warn(`[Pipeline] Invalid transition: ${state.stage} → RETRY_FROM_STAGE(${action.stage})`);
        return state;
      }
      return { ...state, stage: action.stage, progress: 0, error: null, retryCount: state.retryCount + 1 };
    }

    case 'CANCEL': {
      // idle/completed/failedからのキャンセルを拒否
      if (state.stage === 'idle' || state.stage === 'completed' || state.stage === 'failed') {
        console.warn(`[Pipeline] Invalid transition: ${state.stage} → CANCEL`);
        return state;
      }
      return { ...state, stage: 'cancelling' };
    }

    // PROGRESS_UPDATE, STAGE_FAILED, RESET は既存のまま
    case 'PROGRESS_UPDATE':
      return { ...state, progress: action.progress, message: action.message };
    case 'STAGE_FAILED':
      return { ...state, stage: 'failed', error: action.error };
    case 'RESET':
      return initialPipelineState;
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}
```

#### Task 3: usePipelineOrchestratorリトライ

**リトライ実装方針:**

```typescript
const MAX_RETRY_COUNT = 3;

interface UsePipelineOrchestratorReturn {
  state: PipelineState;
  startUpload: (file: File, metadata: UploadMetadata) => Promise<string | null>;
  cancelUpload: () => void;
  retryUpload: () => Promise<string | null>;  // ← 追加
}

// 内部状態: 最後のステージコンテキストを保持
const lastContextRef = useRef<{
  file: File;
  metadata: UploadMetadata;
  assetId: string;
  tusEndpoint: string;
  playbackId: string;
  failedStage: PipelineStage;
} | null>(null);

const retryUpload = useCallback(async (): Promise<string | null> => {
  const ctx = lastContextRef.current;
  if (!ctx || state.stage !== 'failed') return null;

  if (state.retryCount >= MAX_RETRY_COUNT) {
    dispatch({
      type: 'STAGE_FAILED',
      error: {
        category: 'pipeline',
        code: 'MAX_RETRIES_EXCEEDED',
        message: '再試行回数の上限に達しました。最初からやり直してください。',
        retryable: false,
      },
    });
    return null;
  }

  const controller = new AbortController();
  abortControllerRef.current = controller;
  const signal = controller.signal;

  dispatch({ type: 'RETRY_FROM_STAGE', stage: ctx.failedStage });

  console.log(
    `[METRIC] event=pipeline_retry, stage=${ctx.failedStage}, retry_count=${state.retryCount + 1}, timestamp=${new Date().toISOString()}`
  );

  switch (ctx.failedStage) {
    case 'preparing':
      // createAssetから再実行→以降のステージも続行
      return await executeFromPreparing(ctx.file, ctx.metadata, signal);

    case 'uploading':
      // TUS再開→以降のステージも続行
      return await executeFromUploading(ctx, signal);

    case 'transcoding':
      // ポーリング再開→以降のステージも続行
      return await executeFromTranscoding(ctx, signal);

    case 'storing':
      // Irysアップロード再実行
      return await executeFromStoring(ctx, signal);

    default:
      return null;
  }
}, [state, livepeer, irys]);
```

**注意:** リトライ時は失敗したステージから**後続のステージも含めて**再実行する。preparing失敗時はpreparing→uploading→transcoding→storing→completedの全てを再実行。

#### Task 4: TUS resumable upload再開

**tus-js-clientのresumable機能:**

tus-js-clientは内部的にURLストレージ（`localStorage`）を使用して中断地点を記憶する。同じファイルで`new tus.Upload(file, { ...opts })`を再作成して`upload.start()`を呼ぶと、前回の中断地点から自動的に再開する。

**実装方針:**

```typescript
// usePipelineOrchestrator内部
const tusContextRef = useRef<{
  file: File;
  tusEndpoint: string;
} | null>(null);

async function executeFromUploading(
  ctx: RetryContext,
  signal: AbortSignal
): Promise<string | null> {
  dispatch({ type: 'STAGE_START', stage: 'uploading' });

  // LivepeerServiceImplのuploadWithTusは内部でtus.Uploadを生成
  // tus-js-clientは同じendpoint + 同じfileの組み合わせで
  // localStorageキャッシュから中断地点を検出し自動再開する
  const uploadResult = await livepeer.uploadWithTus(
    ctx.file,
    ctx.tusEndpoint,
    (percentage) => {
      dispatch({
        type: 'PROGRESS_UPDATE',
        stage: 'uploading',
        progress: percentage,
        message: `アップロード再開中... ${percentage}%`,
      });
    },
    { signal }
  );

  if (!uploadResult.success) {
    dispatch({ type: 'STAGE_FAILED', error: uploadResult.error });
    lastContextRef.current = { ...ctx, failedStage: 'uploading' };
    return null;
  }

  dispatch({ type: 'STAGE_COMPLETE', stage: 'uploading' });
  // 後続ステージ（transcoding→storing→completed）を続行
  return await executeFromTranscoding(ctx, signal);
}
```

#### Task 5: AppErrorマッピング統一

**`src/lib/error-messages.ts`:**

```typescript
import type { AppError } from '@/types/errors';

interface ErrorAction {
  label: string;
  href?: string;
  action?: 'retry' | 'reset' | 'navigate';
}

const ERROR_MESSAGES: Record<string, Record<string, string>> = {
  livepeer: {
    API_KEY_MISSING: 'Livepeer APIキーが設定されていません。管理者に連絡してください。',
    CREATE_ASSET_FAILED: 'アセットの作成に失敗しました。しばらく待ってから再試行してください。',
    NO_TUS_ENDPOINT: 'アップロード先の取得に失敗しました。再試行してください。',
    UPLOAD_FAILED: '動画のアップロードに失敗しました。ネットワーク接続を確認してください。',
    UPLOAD_CANCELLED: 'アップロードがキャンセルされました。',
    ASSET_NOT_FOUND: '動画が見つかりません。',
    TRANSCODE_FAILED: 'トランスコードに失敗しました。サポート形式: MP4 (H.264), WebM, MOV',
    TRANSCODE_TIMEOUT: 'トランスコードがタイムアウトしました。再試行してください。',
    ABORTED: '操作がキャンセルされました。',
  },
  irys: {
    WALLET_REQUIRED: 'MetaMaskまたは互換ウォレットが必要です。',
    INIT_FAILED: 'Irysストレージへの接続に失敗しました。再試行してください。',
    INSUFFICIENT_FUNDS: 'ストレージ残高が不足しています。デポジットしてから再試行してください。',
    UPLOAD_FAILED: 'Irysへのアップロードに失敗しました。再試行してください。',
    QUERY_FAILED: '動画一覧の取得に失敗しました。再試行してください。',
    METADATA_NOT_FOUND: 'メタデータが見つかりません。',
    DEPOSIT_FAILED: 'デポジットに失敗しました。再試行してください。',
    ABORTED: '操作がキャンセルされました。',
  },
  pipeline: {
    MAX_RETRIES_EXCEEDED: '再試行回数の上限に達しました。最初からやり直してください。',
  },
  wallet: {
    NOT_CONNECTED: 'ウォレットが接続されていません。',
    SIGNATURE_REJECTED: '署名が拒否されました。',
  },
};

const ERROR_ACTIONS: Record<string, Record<string, ErrorAction>> = {
  irys: {
    INSUFFICIENT_FUNDS: { label: '残高を追加', href: '/my-videos', action: 'navigate' },
  },
  livepeer: {
    TRANSCODE_FAILED: { label: '別の形式で再アップロード', action: 'reset' },
  },
  pipeline: {
    MAX_RETRIES_EXCEEDED: { label: '最初からやり直す', action: 'reset' },
  },
};

export function getErrorMessage(error: AppError): string {
  return ERROR_MESSAGES[error.category]?.[error.code] || error.message;
}

export function getErrorAction(error: AppError): ErrorAction | null {
  return ERROR_ACTIONS[error.category]?.[error.code] || null;
}
```

#### Task 6: PipelineErrorDisplayコンポーネント

**`src/components/video/PipelineErrorDisplay.tsx`:**

```typescript
"use client";

import Link from 'next/link';
import type { AppError } from '@/types/errors';
import { getErrorMessage, getErrorAction } from '@/lib/error-messages';

interface PipelineErrorDisplayProps {
  error: AppError;
  retryCount: number;
  maxRetries: number;
  onRetry?: () => void;
  onReset?: () => void;
}

export function PipelineErrorDisplay({
  error,
  retryCount,
  maxRetries,
  onRetry,
  onReset,
}: PipelineErrorDisplayProps) {
  const message = getErrorMessage(error);
  const errorAction = getErrorAction(error);

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-red-500 text-xl">❌</span>
        <div>
          <p className="text-red-800 font-medium">{message}</p>
          <p className="text-red-600 text-sm mt-1">
            エラーコード: {error.category}/{error.code}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        {error.retryable && onRetry && retryCount < maxRetries && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            再試行 ({retryCount + 1}/{maxRetries}回目)
          </button>
        )}

        {errorAction?.action === 'navigate' && errorAction.href && (
          <Link
            href={errorAction.href}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {errorAction.label}
          </Link>
        )}

        {(errorAction?.action === 'reset' || !error.retryable) && onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {errorAction?.label || '最初からやり直す'}
          </button>
        )}
      </div>
    </div>
  );
}
```

#### Task 7: VideoUploader統合

**変更方針:**
- 既存のエラー表示を`PipelineErrorDisplay`に置き換え
- `retryUpload`を「再試行」ボタンに接続
- `cancelUpload`後のRESETをサービス応答ベースに改善（Task 8）
- TranscodeProgressのステージ一覧から`encrypting`を除外（公開動画パス明示化）

**公開動画パスのステージ表示:**
```typescript
const PUBLIC_STAGES = ['preparing', 'uploading', 'transcoding', 'storing', 'completed'];
// encryptingは表示しない（公開動画パイプラインに不要）
```

#### Task 8: cancelUpload改善

**現行の問題:**
```typescript
// 現行コード（usePipelineOrchestrator.ts 行290-294）
const cancelUpload = useCallback(() => {
  abortControllerRef.current?.abort();
  dispatch({ type: 'CANCEL' });
  setTimeout(() => dispatch({ type: 'RESET' }), 500); // ← 仮実装
}, []);
```

**改善方針:**
```typescript
const cancelUpload = useCallback(async () => {
  abortControllerRef.current?.abort();
  dispatch({ type: 'CANCEL' });

  // AbortSignalにより各サービスのPromiseが解決されるのを待つ
  // 短いディレイでUI遷移をスムーズに
  await new Promise(resolve => setTimeout(resolve, 200));
  dispatch({ type: 'RESET' });
}, []);
```

**注意:** サービス層はAbortSignal受信後にResult型で即座に返却するため、大きな遅延は発生しない。200msのディレイはUIのcancelling状態表示用。

### Previous Story Intelligence（Story 2.1-2.5からの学び）

**Story 1.1で確立された基盤（変更禁止）:**
- `types/errors.ts`: Result<T>, AppError, ErrorCategory
- `types/pipeline.ts`: PipelineStage, PipelineState, PipelineAction
- `types/services.ts`: サービスInterface

**Story 2.1で確立された基盤:**
- `lib/pipeline-reducer.ts`: uploadPipelineReducer（本ストーリーでガード追加）
- `lib/pipeline-reducer.test.ts`: 基本テスト（本ストーリーで拡張）
- Dev Notes記載: 「不正遷移ガードはStory 2.6で追加」

**Story 2.1の`cancelUpload`:**
- Dev Notes記載: 「`cancelUpload`のsetTimeoutは仮実装。本来はTUSアップロードの中止完了コールバックで遷移すべき（Story 2.6で改善）」

**Story 2.2で確立された基盤:**
- `usePipelineOrchestrator`: 完全パイプライン（preparing→uploading→transcoding→storing→completed）
- 公開動画パス: encryptingスキップ済み（確認のみ）
- サービス層のAppError返却パターン確立

**既存AppErrorコード一覧（LivepeerServiceImpl + IrysServiceImpl）:**

| category | code | message | retryable |
|----------|------|---------|-----------|
| livepeer | API_KEY_MISSING | Livepeer APIキーが設定されていません | false |
| livepeer | CREATE_ASSET_FAILED | アセット作成に失敗しました | true |
| livepeer | NO_TUS_ENDPOINT | アップロード先が取得できませんでした | true |
| livepeer | UPLOAD_FAILED | 動画のアップロードに失敗しました | true |
| livepeer | UPLOAD_CANCELLED | アップロードがキャンセルされました | true |
| livepeer | ASSET_NOT_FOUND | 動画が見つかりません | false |
| livepeer | TRANSCODE_FAILED | トランスコードに失敗しました | false |
| livepeer | TRANSCODE_TIMEOUT | トランスコードがタイムアウトしました | true |
| livepeer | ABORTED | 操作がキャンセルされました | true |
| irys | WALLET_REQUIRED | MetaMaskまたは互換ウォレットが必要です | false |
| irys | INIT_FAILED | Irysストレージへの接続に失敗しました | true |
| irys | INSUFFICIENT_FUNDS | ストレージ残高が不足しています | false |
| irys | UPLOAD_FAILED | Irysへのアップロードに失敗しました | true |
| irys | QUERY_FAILED | 動画一覧の取得に失敗しました | true |
| irys | METADATA_NOT_FOUND | メタデータが見つかりません | false |
| irys | DEPOSIT_FAILED | デポジットに失敗しました | true |
| irys | ABORTED | 操作がキャンセルされました | true |

### Git Intelligence

**直近コミット分析はStory 2.4と同一。**

Story 2.1-2.5のdev-agentが実装中/完了のため、これらの実装コミットが前提条件。

### Project Structure Notes

**新規/更新ファイル（このストーリー）:**
```
src/
  lib/
    pipeline-reducer.ts        ← 更新（状態遷移ガード追加）
    pipeline-reducer.test.ts   ← 更新（ガードテスト追加）
    error-messages.ts          ← 新規
    error-messages.test.ts     ← 新規
  hooks/
    usePipelineOrchestrator.ts ← 更新（リトライ、TUS再開、cancel改善）
  components/video/
    PipelineErrorDisplay.tsx   ← 新規
    VideoUploader.tsx          ← 更新（PipelineErrorDisplay統合）
```

**変更禁止ファイル:**
- `src/types/errors.ts` — Story 1.1で定義済み
- `src/types/services.ts` — Story 1.1で定義済み
- `src/types/pipeline.ts` — Story 1.1で定義済み
- `src/lib/livepeer.ts` — Result型化済み。Task 4でtus.Uploadインスタンス返却を追加する場合のみ軽微な変更
- `src/lib/irys.ts` — 変更不要
- `src/lib/config.ts` — 変更不要
- `vitest.config.ts` — 変更不要

**既存ファイルとの関係:**
- `src/lib/livepeer.ts` — Task 4でTUS再開のためにtus.Uploadインスタンスを外部から参照可能にする軽微な拡張が必要になる可能性あり。ただし`uploadWithTus`のResult型シグネチャは変更しない
- `src/components/video/TranscodeProgress.tsx` — エラー表示はPipelineErrorDisplayに委譲。TranscodeProgressは進捗表示に集中

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6] — Acceptance Criteria原文
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 4: Frontend Architecture] — ステージ別リトライ可否、キャンセル時クリーンアップ
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — AppError型、Reducerアクション、構造化ログ
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns] — Result型、ファクトリパターン、AbortSignal
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-I5] — 外部プロトコルエラーのユーザー理解可能な表示
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience Principles] — 「エラーは行き止まりではなく迂回路」原則
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 2b] — クリエイターエラーリカバリー
- [Source: _bmad-output/implementation-artifacts/2-1-video-upload-form-livepeer-tus.md] — pipeline-reducer基本実装、cancelUpload仮実装の記載
- [Source: _bmad-output/implementation-artifacts/2-2-transcode-irys-storage.md] — IrysServiceImpl AppErrorコード、パイプライン完全フロー

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
