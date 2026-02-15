# Story 2.1: 動画アップロードフォームとLivepeer TUSアップロード

Status: ready-for-dev

## Story

As a **クリエイター**,
I want **動画ファイルを選択し、メタデータを入力してアップロードを開始する**,
so that **自分のコンテンツをプラットフォームに投稿する最初のステップを実行できる**.

## Acceptance Criteria (BDD)

### AC1: アップロードフォーム入力とTUSアップロード開始

**Given** ログイン済みクリエイターがアップロードページにアクセスした状態
**When** 動画ファイルを選択し、タイトル・説明・カテゴリ・アクセスタイプ（公開）を入力して「アップロード」を押す
**Then** Livepeer TUSプロトコル経由でアップロードが開始される（FR7, FR8, FR10）
**And** `uploadPipelineReducer`がidle→preparing→uploadingとステージ遷移する

### AC2: アップロード進捗表示

**Given** アップロード中の状態
**When** 転送が進行する
**Then** アップロード進捗がプログレスバーとパーセンテージで表示される（FR9）
**And** `[METRIC] event=upload_progress`がコンソールに出力される

### AC3: アップロードキャンセル

**Given** アップロード中の状態
**When** ユーザーがキャンセルを押す
**Then** AbortSignalによりTUSアップロードが中止される
**And** パイプラインがcancelling→idleに遷移する

### AC4: LivepeerServiceImpl Result型準拠

**Given** LivepeerServiceImplが初期化された状態
**When** サービスメソッドを呼び出す
**Then** Result型で結果が返される（throwしない）
**And** タイムアウトが30秒に設定されている（NFR-I3）

## Tasks / Subtasks

- [ ] **Task 1: LivepeerServiceImplリファクタリング** (AC: #4)
  - [ ] 1.1 `src/lib/livepeer.ts`の既存`LivepeerService`クラスを`LivepeerServiceImpl`にリネーム
  - [ ] 1.2 `LivepeerService` Interface（`src/types/services.ts`定義済み）を`implements`
  - [ ] 1.3 全メソッドをResult型パターンに変換（`throw` → `{ success: false, error: AppError }`）
  - [ ] 1.4 全非同期メソッドに`options?: { signal?: AbortSignal }`追加
  - [ ] 1.5 `uploadWithTus`にAbortSignal対応追加（`tus.Upload`の`abort()`呼び出し）
  - [ ] 1.6 タイムアウト30秒をcreateAsset/waitForReadyに設定（NFR-I3）
  - [ ] 1.7 `[METRIC]`構造化ログ出力追加（`event=upload_start`, `event=upload_progress`）
  - [ ] 1.8 シングルトンエクスポートを維持（`export const livepeerServiceImpl = new LivepeerServiceImpl()`）

- [ ] **Task 2: uploadPipelineReducer実装** (AC: #1, #3)
  - [ ] 2.1 `src/lib/pipeline-reducer.ts`を新規作成
  - [ ] 2.2 `PipelineState`初期状態定義（idle、progress 0、error null）
  - [ ] 2.3 `uploadPipelineReducer(state, action): PipelineState`を実装
  - [ ] 2.4 ステージ遷移ルール実装: idle→preparing→uploading（公開動画パスでencryptingスキップ）
  - [ ] 2.5 `CANCEL`アクション: 現在ステージ→cancelling→idle遷移
  - [ ] 2.6 `STAGE_FAILED`アクション: failed状態遷移 + AppError保持
  - [ ] 2.7 `RETRY_FROM_STAGE`アクション: 指定ステージから再開
  - [ ] 2.8 TypeScript `never`型で網羅性チェック

- [ ] **Task 3: pipeline-reducer テスト** (AC: #1, #3)
  - [ ] 3.1 `src/lib/pipeline-reducer.test.ts`を新規作成
  - [ ] 3.2 正常系テスト: idle→preparing→uploading→transcoding遷移（公開動画パス）
  - [ ] 3.3 PROGRESS_UPDATEテスト: progress/message更新
  - [ ] 3.4 CANCELテスト: uploading→cancelling→idle
  - [ ] 3.5 STAGE_FAILEDテスト: エラー情報保持、retryable判定
  - [ ] 3.6 RETRY_FROM_STAGEテスト: 指定ステージから再開
  - [ ] 3.7 RESETテスト: 初期状態へ復帰
  - [ ] 3.8 不正遷移テスト: completed→uploading等の不正遷移が無視される

- [ ] **Task 4: ServiceContext（DI Provider）作成** (AC: #1, #4)
  - [ ] 4.1 `src/contexts/ServiceContext.tsx`を新規作成
  - [ ] 4.2 `ServiceContextType`定義: `{ livepeer: LivepeerService }`（他サービスは後続ストーリーで追加）
  - [ ] 4.3 `ServiceProvider`コンポーネント: 実サービスインスタンスを注入
  - [ ] 4.4 `useServiceContext()`フック: Context取得ヘルパー
  - [ ] 4.5 `src/app/providers.tsx`の`composeProviders`配列に`ServiceProvider`を追加

- [ ] **Task 5: usePipelineOrchestrator実装** (AC: #1, #2, #3)
  - [ ] 5.1 `src/hooks/usePipelineOrchestrator.ts`を新規作成
  - [ ] 5.2 `useReducer(uploadPipelineReducer, initialState)`でstate/dispatch管理
  - [ ] 5.3 `AbortController`管理: startUpload時に生成、cancel時にabort()
  - [ ] 5.4 `startUpload(file, metadata)`: preparing→LivepeerService.createAsset()→uploading→uploadWithTus()
  - [ ] 5.5 進捗コールバック: TUSの`onProgress`→dispatch(PROGRESS_UPDATE)
  - [ ] 5.6 `cancelUpload()`: AbortController.abort()→dispatch(CANCEL)
  - [ ] 5.7 uploading完了時: dispatch(STAGE_COMPLETE, 'uploading')（transcoding以降はStory 2.2で実装）
  - [ ] 5.8 エラー時: AppError変換→dispatch(STAGE_FAILED)
  - [ ] 5.9 `[METRIC]`構造化ログ: `event=upload_start`, `event=upload_complete`（uploadingステージ完了時点）

- [ ] **Task 6: VideoUploaderコンポーネント更新** (AC: #1, #2, #3)
  - [ ] 6.1 `usePipelineOrchestrator`を統合（既存`useVideo().uploadVideo`から切り替え）
  - [ ] 6.2 公開動画アップロード時: アクセスタイプを「公開」のみに制限（限定はStory 4.2）
  - [ ] 6.3 キャンセルボタン追加: uploading中に表示
  - [ ] 6.4 TranscodeProgressコンポーネントを`PipelineState`ベースに更新
  - [ ] 6.5 エラー表示: AppError.messageをユーザー向けメッセージとして表示
  - [ ] 6.6 Revenue Split UIは現状維持（Phase 2機能だが既存UIを壊さない）

- [ ] **Task 7: LivepeerServiceImplテスト** (AC: #4)
  - [ ] 7.1 `src/lib/livepeer.test.ts`を更新
  - [ ] 7.2 createAsset成功テスト: Result<LivepeerUploadResponse>が返る
  - [ ] 7.3 createAsset失敗テスト: `{ success: false, error: AppError }`が返る
  - [ ] 7.4 AbortSignalキャンセルテスト: signal.aborted時にResult errorが返る

- [ ] **Task 8: 最終検証** (AC: #1-4)
  - [ ] 8.1 `pnpm build` — ゼロエラー
  - [ ] 8.2 `pnpm test` — 全テストパス（既存13件 + 新規テスト）
  - [ ] 8.3 `pnpm lint` — 変更ファイルゼロ警告
  - [ ] 8.4 `pnpm dev`で手動動作確認: アップロードフォーム表示→ファイル選択→アップロード開始→進捗表示→キャンセル

## Dev Notes

### 実装順序（依存関係に基づく）

**必ずこの順序で実装すること：**
1. **Task 1 (LivepeerServiceImpl)** — 全ての基盤。Result型パターン + AbortSignal対応
2. **Task 2 (pipeline-reducer)** — pure関数。サービス依存なし
3. **Task 3 (pipeline-reducer test)** — reducer実装直後にテスト（TDD推奨）
4. **Task 4 (ServiceContext)** — DI基盤。Task 1の実装に依存
5. **Task 5 (usePipelineOrchestrator)** — Task 1 + Task 2 + Task 4に依存
6. **Task 6 (VideoUploader更新)** — Task 5に依存
7. **Task 7 (LivepeerServiceImpl test)** — Task 1完了後いつでも可（Task 3と並行可能）
8. **Task 8 (最終検証)** — 全タスク完了後

### Architecture Compliance（必須遵守ルール）

**命名規則:**
- 既存`LivepeerService`クラス → `LivepeerServiceImpl`にリネーム（`Impl`サフィックス必須）
- Interface: `LivepeerService`（`src/types/services.ts`に定義済み。変更禁止）
- Reducerアクション: SCREAMING_SNAKE_CASE（`STAGE_START`, `STAGE_COMPLETE`, `PROGRESS_UPDATE`, `STAGE_FAILED`, `CANCEL`, `RESET`）
- テストファイル: `.test.ts`（コロケーション）

**Result型パターン（全サービス層共通）:**
```typescript
type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E }
```
- サービス層は`throw`禁止。必ず`Result<T>`を返す
- 既存`livepeer.ts`の全`throw new Error()`をResult型に変換すること

**AppError型（`src/types/errors.ts`定義済み）:**
```typescript
type AppError = {
  category: ErrorCategory;  // 'livepeer' for this story
  code: string;             // 'CREATE_ASSET_FAILED', 'UPLOAD_FAILED', 'TIMEOUT'
  message: string;          // ユーザー向け日本語メッセージ
  retryable: boolean;
  cause?: unknown;
}
```

**AbortSignal統一パターン:**
```typescript
// LivepeerServiceImplの全非同期メソッドに追加
async createAsset(name: string, options?: { signal?: AbortSignal }): Promise<Result<LivepeerUploadResponse>>

// usePipelineOrchestratorがAbortControllerを管理
const controller = new AbortController();
// cancel時: controller.abort()
```

**uploadWithTusのAbortSignal対応:**
```typescript
async uploadWithTus(
  file: File,
  tusEndpoint: string,
  onProgress?: (percentage: number) => void,
  options?: { signal?: AbortSignal }
): Promise<Result<void>> {
  return new Promise((resolve) => {
    const upload = new tus.Upload(file, { /* ... */ });

    // AbortSignal対応
    options?.signal?.addEventListener('abort', () => {
      upload.abort();
      resolve({ success: false, error: {
        category: 'livepeer', code: 'UPLOAD_CANCELLED',
        message: 'アップロードがキャンセルされました', retryable: true
      }});
    });

    upload.start();
  });
}
```

**Pipelineステートマシン（公開動画パス — Story 2.1スコープ）:**
```
idle → preparing → uploading → [Story 2.2でtranscoding以降を実装]
                                ↘ failed
任意ステージ → cancelling → idle
```

**注意:** Story 2.1では`uploading`完了までを実装。`transcoding`→`storing`→`completed`のオーケストレーションはStory 2.2で実装する。`usePipelineOrchestrator`は`uploading`完了時に`STAGE_COMPLETE`をdispatchし、その後のステージ遷移はStory 2.2で拡張する設計とする。

**構造化ログフォーマット:**
```
[METRIC] event=upload_start, file_size_bytes=X, file_type=Y, timestamp=Z
[METRIC] event=upload_progress, percentage=X, stage=uploading, timestamp=Z
[METRIC] event=upload_stage_complete, stage=uploading, duration_ms=X, timestamp=Z
```

### Technical Requirements

#### Task 1: LivepeerServiceImplリファクタリング

**現行コード（`src/lib/livepeer.ts`）の問題:**
- クラス名が`LivepeerService`でInterfaceと衝突する
- 全メソッドが`throw`する（Result型非準拠）
- AbortSignal未対応
- タイムアウト設定なし
- 構造化ログなし

**リファクタリング方針:**
```typescript
import type { LivepeerService as LivepeerServiceInterface } from '@/types/services';
import type { Result } from '@/types/errors';
import type { LivepeerAsset, LivepeerUploadResponse } from '@/types/video';

export class LivepeerServiceImpl implements LivepeerServiceInterface {
  private client: Livepeer | null = null;
  private static readonly TIMEOUT_MS = 30_000; // NFR-I3: Livepeer 30秒

  private getClient(): Result<Livepeer> {
    // throwではなくResult型でエラー返却
  }

  async createAsset(
    name: string,
    options?: { signal?: AbortSignal }
  ): Promise<Result<LivepeerUploadResponse>> {
    try {
      // AbortSignalチェック
      if (options?.signal?.aborted) {
        return { success: false, error: { category: 'livepeer', code: 'ABORTED', message: '操作がキャンセルされました', retryable: true }};
      }
      // ... 既存ロジック
      return { success: true, data: { assetId, uploadUrl, tusEndpoint, task } };
    } catch (e) {
      return { success: false, error: { category: 'livepeer', code: 'CREATE_ASSET_FAILED', message: 'アセット作成に失敗しました', retryable: true, cause: e }};
    }
  }

  async uploadWithTus(
    file: File,
    tusEndpoint: string,
    onProgress?: (percentage: number) => void,
    options?: { signal?: AbortSignal }
  ): Promise<Result<void>> {
    // tus.Uploadのabort()をAbortSignalに接続
    // onProgress内で[METRIC]ログ出力
  }

  // waitForReady, downloadHlsManifest も同様にResult型化
}

export const livepeerServiceImpl = new LivepeerServiceImpl();
```

**AppErrorコード一覧（LivepeerServiceImpl）:**

| code | message | retryable | 発生箇所 |
|------|---------|-----------|---------|
| `API_KEY_MISSING` | Livepeer APIキーが設定されていません | false | getClient |
| `CREATE_ASSET_FAILED` | アセット作成に失敗しました | true | createAsset |
| `NO_TUS_ENDPOINT` | アップロード先が取得できませんでした | true | createAsset |
| `UPLOAD_FAILED` | 動画のアップロードに失敗しました | true | uploadWithTus |
| `UPLOAD_CANCELLED` | アップロードがキャンセルされました | true | uploadWithTus |
| `ASSET_NOT_FOUND` | 動画が見つかりません | false | getAsset |
| `TRANSCODE_FAILED` | トランスコードに失敗しました | false | waitForReady |
| `TRANSCODE_TIMEOUT` | トランスコードがタイムアウトしました | true | waitForReady |
| `ABORTED` | 操作がキャンセルされました | true | 全メソッド |

#### Task 2: uploadPipelineReducer

**`src/lib/pipeline-reducer.ts`:**
```typescript
import type { PipelineState, PipelineAction, PipelineStage } from '@/types/pipeline';

export const initialPipelineState: PipelineState = {
  stage: 'idle',
  progress: 0,
  message: '',
  error: null,
  retryCount: 0,
  lastCompletedStage: null,
};

export function uploadPipelineReducer(
  state: PipelineState,
  action: PipelineAction
): PipelineState {
  switch (action.type) {
    case 'STAGE_START':
      return { ...state, stage: action.stage, progress: 0, message: '', error: null };
    case 'STAGE_COMPLETE':
      return { ...state, lastCompletedStage: action.stage, progress: 100 };
    case 'PROGRESS_UPDATE':
      return { ...state, progress: action.progress, message: action.message };
    case 'STAGE_FAILED':
      return { ...state, stage: 'failed', error: action.error };
    case 'RETRY_FROM_STAGE':
      return { ...state, stage: action.stage, progress: 0, error: null, retryCount: state.retryCount + 1 };
    case 'CANCEL':
      return { ...state, stage: 'cancelling' };
    case 'RESET':
      return initialPipelineState;
    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}
```

**不正遷移ガード:** Story 2.1ではシンプルに全アクションを受理する。不正遷移ガード（completed状態でSTAGE_STARTを拒否等）はStory 2.6（エラーハンドリング強化）で追加する。

#### Task 4: ServiceContext

**`src/contexts/ServiceContext.tsx`:**
```typescript
"use client";

import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { LivepeerService } from '@/types/services';
import { livepeerServiceImpl } from '@/lib/livepeer';

interface ServiceContextType {
  livepeer: LivepeerService;
  // 後続ストーリーで追加:
  // lit: LitService;
  // irys: IrysService;
  // video: VideoService;
}

const ServiceContext = createContext<ServiceContextType | null>(null);

export function ServiceProvider({ children }: PropsWithChildren) {
  const services = useMemo<ServiceContextType>(() => ({
    livepeer: livepeerServiceImpl,
  }), []);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}

export function useServiceContext(): ServiceContextType {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useServiceContext must be used within ServiceProvider');
  }
  return ctx;
}
```

**providers.tsx更新:**
```typescript
const ComposedProviders = composeProviders([
  WalletProvider,
  ServiceProvider, // ← 追加
]);
```

#### Task 5: usePipelineOrchestrator

**`src/hooks/usePipelineOrchestrator.ts`:**
```typescript
"use client";

import { useReducer, useRef, useCallback } from 'react';
import { uploadPipelineReducer, initialPipelineState } from '@/lib/pipeline-reducer';
import { useServiceContext } from '@/contexts/ServiceContext';
import type { PipelineState } from '@/types/pipeline';

interface UploadMetadata {
  title: string;
  description: string;
  category: string;
  tags: string[];
  accessType: 'public'; // Story 2.1では公開のみ
}

interface UsePipelineOrchestratorReturn {
  state: PipelineState;
  startUpload: (file: File, metadata: UploadMetadata) => Promise<void>;
  cancelUpload: () => void;
}

export function usePipelineOrchestrator(): UsePipelineOrchestratorReturn {
  const [state, dispatch] = useReducer(uploadPipelineReducer, initialPipelineState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { livepeer } = useServiceContext();

  const startUpload = useCallback(async (file: File, metadata: UploadMetadata) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;
    const startTime = Date.now();

    console.log(`[METRIC] event=upload_start, file_size_bytes=${file.size}, file_type=${file.type}, timestamp=${new Date().toISOString()}`);

    // Stage 1: preparing
    dispatch({ type: 'STAGE_START', stage: 'preparing' });
    const assetResult = await livepeer.createAsset(metadata.title, { signal });
    if (!assetResult.success) {
      dispatch({ type: 'STAGE_FAILED', error: assetResult.error });
      return;
    }
    dispatch({ type: 'STAGE_COMPLETE', stage: 'preparing' });

    // Stage 2: uploading
    dispatch({ type: 'STAGE_START', stage: 'uploading' });
    const uploadResult = await livepeer.uploadWithTus(
      file,
      assetResult.data.tusEndpoint,
      (percentage) => {
        dispatch({ type: 'PROGRESS_UPDATE', stage: 'uploading', progress: percentage, message: `アップロード中... ${percentage}%` });
      },
      { signal }
    );
    if (!uploadResult.success) {
      dispatch({ type: 'STAGE_FAILED', error: uploadResult.error });
      return;
    }
    dispatch({ type: 'STAGE_COMPLETE', stage: 'uploading' });

    const durationMs = Date.now() - startTime;
    console.log(`[METRIC] event=upload_stage_complete, stage=uploading, duration_ms=${durationMs}, asset_id=${assetResult.data.assetId}, timestamp=${new Date().toISOString()}`);

    // Story 2.2で transcoding → storing → completed を実装
    // ここではuploading完了で一旦停止
  }, [livepeer]);

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: 'CANCEL' });
    // cancellingの後idle復帰
    setTimeout(() => dispatch({ type: 'RESET' }), 500);
  }, []);

  return { state, startUpload, cancelUpload };
}
```

**注意点:**
- `startUpload`はassetIdを返さない（Story 2.2でtranscoding管理のためにassetId保持の拡張が必要）
- Story 2.2でこのhookを拡張し、transcoding→storing→completed のオーケストレーションを追加する
- `cancelUpload`のsetTimeoutは仮実装。本来はTUSアップロードの中止完了コールバックで遷移すべき（Story 2.6で改善）

#### Task 6: VideoUploader更新

**変更方針:**
- `useVideo().uploadVideo`呼び出しを`usePipelineOrchestrator().startUpload`に切り替え
- 既存UI構造は維持（フォームフィールド、ドラッグ&ドロップ等）
- `TranscodeProgress`に`PipelineState`を渡すように変更
- キャンセルボタン追加

**TranscodeProgressの更新:**
- 既存の`UploadProgress`型（`types/video.ts`）ではなく`PipelineState`型（`types/pipeline.ts`）を受け取るように変更
- 既存の`UploadProgress`型は後方互換のため残す（他の箇所で参照されている可能性）
- `PipelineState`の`stage`フィールドにはidle/cancellingが追加されているので対応

**アクセスタイプ制限:**
- Story 2.1では公開動画のみ。`ACCESS_TYPES`配列を公開のみ表示に変更（token-gated/subscriptionは限定動画パイプラインStory 4.2で有効化）
- ただし既存の型定義は変更しない

### Previous Story Intelligence（Story 1.1からの学び）

**Story 1.1で確立されたパターン:**
- `types/errors.ts`: Result<T>, AppError, ErrorCategory — **既に定義済み。再定義禁止**
- `types/services.ts`: LivepeerService Interface — **既に定義済み。変更禁止**
- `types/pipeline.ts`: PipelineStage, PipelineState, PipelineAction — **既に定義済み。変更禁止**
- `lib/compose-providers.tsx`: composeProviders — **既に存在。利用可能**
- `vitest.config.ts`: @/エイリアス同期済み — **テスト即座に書ける**
- `config.ts`: Zod環境変数バリデーション — **getEnv()が型安全**

**Story 1.1コードレビューからの教訓:**
- H2修正: Ethereumアドレスのhex正規表現バリデーションが追加済み
- H3修正: `services.ts`のLitService型がAccessControlCondition[]型に改善済み
- M2修正: `.gitignore`にplaywright-report/が追加済み

**Story 1.1で残ったLow（このストーリーで対応可能）:**
- L1: `compose-providers.tsx`ユニットテスト — 後続ストーリーで対応（このストーリーのスコープ外）

### Git Intelligence

**直近コミット分析（最新5件）:**
1. `d98eeb5` docs: add sprint planning artifacts and test scaffolding
2. `13440ad` feat: integrate Privy AA and MetaMask dual wallet authentication
3. `50e82c5` chore: update dependencies and add test infrastructure
4. `166826a` docs: complete architecture decision document
5. `6b3b584` docs: complete PRD

**コミット`13440ad`（Privy AA統合）から得られる情報:**
- 認証パス2種類が統合済み（AA + MetaMask）
- `WalletContext`が統一Walletインターフェースとして機能
- `useWalletContext()`で`address`と`walletClient`が取得可能

**コミット`50e82c5`（テスト基盤）から得られる情報:**
- Vitest 4.x導入済み
- Playwright 1.58.x導入済み
- 13件のユニットテスト通過確認済み

### Project Structure Notes

**新規ファイル（このストーリーで作成）:**
```
src/
  lib/
    livepeer.ts              ← 更新（LivepeerServiceImplリファクタ）
    livepeer.test.ts         ← 更新（Result型テスト追加）
    pipeline-reducer.ts      ← 新規
    pipeline-reducer.test.ts ← 新規
  contexts/
    ServiceContext.tsx        ← 新規
  hooks/
    usePipelineOrchestrator.ts ← 新規
  components/video/
    VideoUploader.tsx         ← 更新（usePipelineOrchestrator統合）
    TranscodeProgress.tsx     ← 更新（PipelineState対応）
  app/
    providers.tsx             ← 更新（ServiceProvider追加）
```

**変更禁止ファイル:**
- `src/types/errors.ts` — Story 1.1で定義済み
- `src/types/services.ts` — Story 1.1で定義済み（LivepeerService Interface）
- `src/types/pipeline.ts` — Story 1.1で定義済み
- `src/types/video.ts` — 既存型は共存（後続ストーリーで整理）
- `vitest.config.ts` — Story 1.1で設定済み
- `playwright.config.ts` — Story 1.1で設定済み

**既存ファイルとの関係:**
- `src/lib/video.ts` — 既存の`videoService`は本ストーリーでは変更しない。`useVideo`フックの`uploadVideo`はStory 2.2完了後に`usePipelineOrchestrator`に完全移行
- `src/hooks/useVideo.ts` — 既存のまま維持。Story 2.2で`usePipelineOrchestrator`完全統合後に非推奨化
- `src/components/UploadForm.tsx` — 旧Lit暗号化アップロードフォーム。このストーリーでは変更しない

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — Acceptance Criteria原文
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 3: API & Communication Patterns] — Result型、サービス層抽象化
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 4: Frontend Architecture] — Pipeline reducer + usePipelineOrchestrator分離、ServiceProvider DI
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — 命名規則、AbortSignalパターン、構造化ログ
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — ファイル配置、テスト配置ルール
- [Source: _bmad-output/planning-artifacts/prd.md#FR7-FR10] — 動画アップロード機能要件
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-I3] — プロトコル別タイムアウト（Livepeer: 30秒）
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Effortless Interactions] — アップロード体験設計
- [Source: _bmad-output/implementation-artifacts/1-1-project-foundation-security-update.md] — Story 1.1で確立した基盤パターン

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
