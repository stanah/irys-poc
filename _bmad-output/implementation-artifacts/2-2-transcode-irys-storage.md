# Story 2.2: トランスコードとIrysへの保存

Status: done

## Story

As a **クリエイター**,
I want **アップロードした動画が自動的にトランスコードされ、永続ストレージに保存される**,
so that **HLSストリーミング形式で誰でも視聴できる状態になる**.

## Acceptance Criteria (BDD)

### AC1: トランスコード進捗表示

**Given** TUSアップロードが完了した状態
**When** Livepeerが自動的にトランスコード処理を行う
**Then** パイプラインがuploading→transcodingに遷移し、トランスコード進捗が表示される（FR11）
**And** `usePipelineOrchestrator`がポーリングでトランスコード完了を監視する

### AC2: Irysへの保存

**Given** トランスコードが完了した状態
**When** HLSセグメントが準備完了する
**Then** パイプラインがtranscoding→storingに遷移する
**And** IrysServiceImplがメタデータ（タイトル、説明、カテゴリ、アクセスタイプ、Creator）と動画データをIrysに保存する
**And** IrysタグはPascalCase（`AppName`, `AccessType`, `Creator`等）で設定される

### AC3: トランスコード失敗エラー表示

**Given** トランスコードが失敗した状態
**When** サポートされていないフォーマットの動画がアップロードされた
**Then** 「トランスコードに失敗しました」とサポート形式（MP4 H.264, WebM, MOV）が表示される（FR13）
**And** パイプラインがfailed状態に遷移し、AppError（category: 'livepeer', retryable: false）が設定される

### AC4: Irys残高不足エラー表示

**Given** Irysストレージ残高が不足している状態
**When** 保存を試みる
**Then** 「ストレージ残高が不足しています」と必要額・現在残高が表示される（FR14）
**And** 「残高を追加」リンクが提示される

### AC5: パイプライン完了とメトリクス

**Given** パイプライン全体が完了した状態
**When** storing→completedに遷移する
**Then** `[METRIC] event=upload_complete, duration_ms=X, video_type=public`がログ出力される（NFR-P5）

## Tasks / Subtasks

- [ ] **Task 1: IrysServiceImplリファクタリング** (AC: #2, #4)
  - [ ] 1.1 `src/lib/irys.ts`の既存`IrysService`クラスを`IrysServiceImpl`にリネーム
  - [ ] 1.2 `IrysService` Interface（`src/types/services.ts`定義済み）を`implements`
  - [ ] 1.3 全メソッドをResult型パターンに変換（`throw` → `{ success: false, error: AppError }`）
  - [ ] 1.4 全非同期メソッドに`options?: { signal?: AbortSignal }`追加
  - [ ] 1.5 `uploadData`の残高不足チェックで`INSUFFICIENT_FUNDS` AppError返却（必要額・現在残高を`message`に含む）
  - [ ] 1.6 `fundAccount()`を`deposit()`にリネーム（Interface準拠）
  - [ ] 1.7 `getUploadPrice()`をprivateメソッドに変更（Interface外の内部実装）
  - [ ] 1.8 タイムアウト15秒を設定（NFR-I3: Irys 15秒）
  - [ ] 1.9 `queryFiles`のGraphQLエンドポイントを環境変数化（NFR-I4: `IRYS_GRAPHQL_ENDPOINT`）
  - [ ] 1.10 シングルトンエクスポート: `export const irysServiceImpl = new IrysServiceImpl()`

- [ ] **Task 2: IrysServiceImplテスト** (AC: #2, #4)
  - [ ] 2.1 `src/lib/irys.test.ts`を新規作成
  - [ ] 2.2 uploadData成功テスト: `Result<{ id: string }>`が返る
  - [ ] 2.3 uploadData残高不足テスト: `{ success: false, error: { code: 'INSUFFICIENT_FUNDS' } }`が返る
  - [ ] 2.4 getBalance成功テスト: `Result<{ balance, formatted }>`が返る
  - [ ] 2.5 AbortSignalキャンセルテスト

- [ ] **Task 3: ServiceContextにIrysService追加** (AC: #2)
  - [ ] 3.1 `src/contexts/ServiceContext.tsx`の`ServiceContextType`に`irys: IrysService`追加
  - [ ] 3.2 `ServiceProvider`で`irysServiceImpl`を注入
  - [ ] 3.3 既存のLivepeerService注入はそのまま維持

- [ ] **Task 4: usePipelineOrchestrator拡張（transcoding→storing→completed）** (AC: #1, #2, #3, #5)
  - [ ] 4.1 `src/hooks/usePipelineOrchestrator.ts`を更新
  - [ ] 4.2 `startUpload`にassetId/playbackIdの状態保持を追加（uploading完了後に使用）
  - [ ] 4.3 transcoding ステージ実装:
    - LivepeerService.waitForReady()をポーリング呼び出し
    - onProgressコールバックでPROGRESS_UPDATE dispatch
    - 失敗時: AppError（category: 'livepeer', code: 'TRANSCODE_FAILED', retryable: false）+ サポート形式メッセージ
  - [ ] 4.4 storing ステージ実装:
    - LivepeerService.downloadHlsManifest()でHLSコンテンツ取得
    - HLSセグメント + マニフェスト + サムネイル + メタデータをIrysに保存
    - Irysタグ: PascalCase（`AppName: "DecentralizedVideo"`, `AccessType: "public"`, `Creator`, `Title`, `Category`等）
    - 保存進捗をPROGRESS_UPDATE dispatch
  - [ ] 4.5 残高不足ハンドリング: IrysService.uploadDataのINSUFFICIENT_FUNDSエラーをSTAGE_FAILEDにdispatch
  - [ ] 4.6 completed ステージ: storing完了後にSTAGE_COMPLETE dispatch + metadataCid返却
  - [ ] 4.7 `[METRIC]`構造化ログ:
    - `event=transcode_start`, `event=transcode_complete, duration_ms=X`
    - `event=irys_upload, size_bytes=X, cost_atomic=Y, duration_ms=Z`
    - `event=upload_complete, duration_ms=X, video_type=public`（NFR-P5）
  - [ ] 4.8 公開動画パス: encryptingステージをスキップ（idle→preparing→uploading→transcoding→storing→completed）
  - [ ] 4.9 戻り値にmetadataCid（Irysトランザクション ID）を含める

- [ ] **Task 5: アップロード完了UIとエラー表示** (AC: #3, #4, #5)
  - [ ] 5.1 `src/components/video/VideoUploader.tsx`のTranscodeProgressを完了状態対応に更新
  - [ ] 5.2 トランスコード失敗メッセージ表示: サポート形式（MP4 H.264, WebM, MOV）の案内
  - [ ] 5.3 残高不足エラー表示: 必要額・現在残高 + 「残高を追加」リンク（Story 2.3のデポジットページへ遷移）
  - [ ] 5.4 パイプライン完了表示: 「動画が正常にアップロードされました」+ 動画ページへのリンク

- [ ] **Task 6: Irysタグ命名規則の統一** (AC: #2)
  - [ ] 6.1 IrysアップロードのタグをPascalCaseに統一:
    - `App-Name` → `AppName`
    - `Content-Type` → `Content-Type`（HTTP標準は例外で維持）
    - `Type`, `Creator`, `Title`, `Category`, `AccessType`, `Tag` — 既にPascalCase
  - [ ] 6.2 テストデータ分離タグ: `AppName: "DecentralizedVideo-Test"`をテスト用に設定可能に

- [ ] **Task 7: 最終検証** (AC: #1-5)
  - [ ] 7.1 `pnpm build` — ゼロエラー
  - [ ] 7.2 `pnpm test` — 全テストパス（既存 + 新規）
  - [ ] 7.3 `pnpm lint` — 変更ファイルゼロ警告
  - [ ] 7.4 `pnpm dev`で手動動作確認: アップロード→トランスコード進捗→Irys保存→完了表示

## Dev Notes

### 実装順序（依存関係に基づく）

**必ずこの順序で実装すること：**
1. **Task 1 (IrysServiceImpl)** — Irysサービス基盤。Result型パターン + AbortSignal対応
2. **Task 2 (IrysServiceImpl test)** — Task 1直後にテスト
3. **Task 3 (ServiceContext更新)** — Task 1に依存
4. **Task 6 (Irysタグ統一)** — Task 4の前にタグ規則を確定
5. **Task 4 (usePipelineOrchestrator拡張)** — Task 1 + Task 3に依存。本ストーリーの中核
6. **Task 5 (UI更新)** — Task 4に依存
7. **Task 7 (最終検証)** — 全タスク完了後

### Story 2.1への依存関係（前提条件）

**Story 2.1で実装済みの基盤（このストーリーが前提とするもの）:**

| コンポーネント | ファイル | 状態 |
|--------------|--------|------|
| `LivepeerServiceImpl` | `src/lib/livepeer.ts` | Result型化済み、AbortSignal対応済み |
| `uploadPipelineReducer` | `src/lib/pipeline-reducer.ts` | ステージ遷移ロジック実装済み |
| `usePipelineOrchestrator` | `src/hooks/usePipelineOrchestrator.ts` | idle→preparing→uploading実装済み。**このストーリーでtranscoding以降を拡張** |
| `ServiceContext` | `src/contexts/ServiceContext.tsx` | LivepeerService注入済み。**このストーリーでIrysService追加** |
| `TranscodeProgress` | `src/components/video/TranscodeProgress.tsx` | PipelineState対応済み |

**注意:** Story 2.1の`usePipelineOrchestrator`はuploading完了で停止する設計。このストーリーでtranscoding→storing→completedのオーケストレーションを追加拡張する。

### Architecture Compliance（必須遵守ルール）

**命名規則:**
- 既存`IrysService`クラス → `IrysServiceImpl`にリネーム（`Impl`サフィックス必須）
- Interface: `IrysService`（`src/types/services.ts`に定義済み。変更禁止）
- Irysタグ: PascalCase（`AppName`, `AccessType`）。ハイフン禁止（`App-Name`→`AppName`に変換）
- 例外: `Content-Type`はHTTP標準準拠のため維持

**Result型パターン:**
```typescript
// IrysServiceImplの全メソッドはResult<T>を返す
async uploadData(
  data: string,
  tags: { name: string; value: string }[],
  options?: { signal?: AbortSignal }
): Promise<Result<{ id: string }>>
```

**AppError型:**
```typescript
// category: 'irys' for this story
type AppError = {
  category: 'irys';
  code: string;
  message: string;     // ユーザー向け日本語メッセージ
  retryable: boolean;
  cause?: unknown;
}
```

**構造化ログフォーマット:**
```
[METRIC] event=transcode_start, asset_id=X, timestamp=Z
[METRIC] event=transcode_complete, asset_id=X, duration_ms=Y, timestamp=Z
[METRIC] event=irys_upload, size_bytes=X, cost_atomic=Y, duration_ms=Z, type=video-segment, timestamp=W
[METRIC] event=irys_upload, size_bytes=X, cost_atomic=Y, duration_ms=Z, type=video-metadata, timestamp=W
[METRIC] event=upload_complete, duration_ms=X, video_type=public, asset_id=Y, metadata_cid=Z, timestamp=W
```

**Pipelineステートマシン（公開動画フルパス — Story 2.1 + 2.2スコープ）:**
```
idle → preparing → uploading → transcoding → storing → completed
                                                        ↘ failed
任意ステージ → cancelling → idle
```
- `encrypting`ステージは公開動画ではスキップ（Story 4.2で限定動画パイプラインに追加）

### Technical Requirements

#### Task 1: IrysServiceImplリファクタリング

**現行コード（`src/lib/irys.ts`）の問題:**
- クラス名が`IrysService`でInterfaceと衝突する
- 全メソッドが`throw`する（Result型非準拠）
- AbortSignal未対応
- GraphQLエンドポイントがハードコード（`https://uploader.irys.xyz/graphql`）
- タイムアウト設定なし
- Irysタグに`App-Name`（ハイフン入り）を使用

**リファクタリング方針:**
```typescript
import type { IrysService as IrysServiceInterface } from '@/types/services';
import type { Result, AppError } from '@/types/errors';

export class IrysServiceImpl implements IrysServiceInterface {
  private static readonly TIMEOUT_MS = 15_000; // NFR-I3: Irys 15秒

  private async getWebIrys(): Promise<Result<WebUploader>> {
    // throwではなくResult型でエラー返却
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        return { success: false, error: {
          category: 'irys', code: 'WALLET_REQUIRED',
          message: 'MetaMaskまたは互換ウォレットが必要です',
          retryable: false
        }};
      }
      // ... 既存ロジック
      return { success: true, data: irysUploader };
    } catch (e) {
      return { success: false, error: {
        category: 'irys', code: 'INIT_FAILED',
        message: 'Irysストレージへの接続に失敗しました',
        retryable: true, cause: e
      }};
    }
  }

  async uploadData(
    data: string,
    tags: { name: string; value: string }[],
    options?: { signal?: AbortSignal }
  ): Promise<Result<{ id: string }>> {
    if (options?.signal?.aborted) {
      return { success: false, error: {
        category: 'irys', code: 'ABORTED',
        message: '操作がキャンセルされました', retryable: true
      }};
    }

    const irysResult = await this.getWebIrys();
    if (!irysResult.success) return irysResult;
    const irys = irysResult.data;

    // 残高チェック
    const dataSize = new TextEncoder().encode(data).length;
    const price = await irys.getPrice(dataSize);
    const balance = await irys.getBalance();

    if (balance.lt(price)) {
      return { success: false, error: {
        category: 'irys', code: 'INSUFFICIENT_FUNDS',
        message: `ストレージ残高が不足しています。必要額: ${irys.utils.fromAtomic(price)} ETH、現在残高: ${irys.utils.fromAtomic(balance)} ETH`,
        retryable: false // デポジットが必要なのでretryでは解決しない
      }};
    }

    try {
      const receipt = await irys.upload(data, { tags });
      return { success: true, data: { id: receipt.id } };
    } catch (e) {
      return { success: false, error: {
        category: 'irys', code: 'UPLOAD_FAILED',
        message: 'Irysへのアップロードに失敗しました',
        retryable: true, cause: e
      }};
    }
  }

  // getBalance, deposit, queryFiles, getMetadata も同様にResult型化
}

export const irysServiceImpl = new IrysServiceImpl();
```

**AppErrorコード一覧（IrysServiceImpl）:**

| code | message | retryable | 発生箇所 |
|------|---------|-----------|---------|
| `WALLET_REQUIRED` | MetaMaskまたは互換ウォレットが必要です | false | getWebIrys |
| `INIT_FAILED` | Irysストレージへの接続に失敗しました | true | getWebIrys |
| `INSUFFICIENT_FUNDS` | ストレージ残高が不足しています。必要額: X ETH、現在残高: Y ETH | false | uploadData |
| `UPLOAD_FAILED` | Irysへのアップロードに失敗しました | true | uploadData |
| `QUERY_FAILED` | 動画一覧の取得に失敗しました | true | queryFiles |
| `METADATA_NOT_FOUND` | メタデータが見つかりません | false | getMetadata |
| `DEPOSIT_FAILED` | デポジットに失敗しました | true | deposit |
| `ABORTED` | 操作がキャンセルされました | true | 全メソッド |

**環境変数追加（NFR-I4）:**
- `config.ts`の`clientEnvSchema`に`NEXT_PUBLIC_IRYS_GRAPHQL_ENDPOINT`を追加（デフォルト: `https://uploader.irys.xyz/graphql`）
- `.env.example`に追記

```typescript
// config.ts に追加
NEXT_PUBLIC_IRYS_GRAPHQL_ENDPOINT: z.string().url().default('https://uploader.irys.xyz/graphql'),
```

#### Task 4: usePipelineOrchestrator拡張

**Story 2.1からの拡張ポイント:**

Story 2.1の`startUpload`はuploading完了で停止していた。このストーリーで以下を追加:

```typescript
export function usePipelineOrchestrator(): UsePipelineOrchestratorReturn {
  const [state, dispatch] = useReducer(uploadPipelineReducer, initialPipelineState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { livepeer, irys } = useServiceContext(); // ← irys追加

  const startUpload = useCallback(async (file: File, metadata: UploadMetadata) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;
    const pipelineStartTime = Date.now();

    // ... Story 2.1: preparing → uploading (既存) ...

    // === Story 2.2 追加部分 ===

    // Stage 3: transcoding
    dispatch({ type: 'STAGE_START', stage: 'transcoding' });
    const transcodeStartTime = Date.now();
    console.log(`[METRIC] event=transcode_start, asset_id=${assetResult.data.assetId}, timestamp=${new Date().toISOString()}`);

    const readyResult = await livepeer.waitForReady(
      assetResult.data.assetId,
      (status) => {
        const pct = status.progress ? Math.round(status.progress * 100) : 0;
        dispatch({
          type: 'PROGRESS_UPDATE', stage: 'transcoding',
          progress: pct, message: `トランスコード中... ${pct}%`
        });
      },
      { signal }
    );

    if (!readyResult.success) {
      // トランスコード失敗: サポート形式案内を含むエラー
      const error: AppError = {
        ...readyResult.error,
        message: readyResult.error.code === 'TRANSCODE_FAILED'
          ? 'トランスコードに失敗しました。サポート形式: MP4 (H.264), WebM, MOV'
          : readyResult.error.message,
      };
      dispatch({ type: 'STAGE_FAILED', error });
      return null;
    }

    const transcodeDuration = Date.now() - transcodeStartTime;
    console.log(`[METRIC] event=transcode_complete, asset_id=${assetResult.data.assetId}, duration_ms=${transcodeDuration}, timestamp=${new Date().toISOString()}`);
    dispatch({ type: 'STAGE_COMPLETE', stage: 'transcoding' });

    // Stage 4: storing (公開動画 — encryptingスキップ)
    dispatch({ type: 'STAGE_START', stage: 'storing' });

    // 4a: HLSマニフェストダウンロード
    dispatch({ type: 'PROGRESS_UPDATE', stage: 'storing', progress: 5, message: 'HLSデータをダウンロード中...' });
    const hlsResult = await livepeer.downloadHlsManifest(readyResult.data.playbackId, { signal });
    if (!hlsResult.success) {
      dispatch({ type: 'STAGE_FAILED', error: hlsResult.error });
      return null;
    }

    // 4b: HLSセグメントをIrysに保存
    // ... セグメント保存ロジック（進捗dispatch付き）

    // 4c: メタデータをIrysに保存（PascalCaseタグ）
    const metadataResult = await irys.uploadData(
      JSON.stringify(metadataObj),
      [
        { name: 'AppName', value: 'DecentralizedVideo' },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Type', value: 'video-metadata' },
        { name: 'Creator', value: address },
        { name: 'Title', value: metadata.title },
        { name: 'Category', value: metadata.category },
        { name: 'AccessType', value: 'public' },
        ...metadata.tags.map(tag => ({ name: 'Tag', value: tag })),
      ],
      { signal }
    );

    if (!metadataResult.success) {
      dispatch({ type: 'STAGE_FAILED', error: metadataResult.error });
      return null;
    }

    dispatch({ type: 'STAGE_COMPLETE', stage: 'storing' });

    // Pipeline complete
    dispatch({ type: 'STAGE_START', stage: 'completed' });
    const totalDuration = Date.now() - pipelineStartTime;
    console.log(`[METRIC] event=upload_complete, duration_ms=${totalDuration}, video_type=public, asset_id=${assetResult.data.assetId}, metadata_cid=${metadataResult.data.id}, timestamp=${new Date().toISOString()}`);

    return metadataResult.data.id; // Irys CID = 動画ID
  }, [livepeer, irys]);

  // ... cancelUpload (Story 2.1から維持) ...
}
```

**startUploadの戻り値変更:**
- Story 2.1: `Promise<void>`（uploading完了で停止）
- Story 2.2: `Promise<string | null>`（metadataCid返却、失敗時null）

**Irys保存の詳細フロー（storingステージ内部）:**

```
storing(0%): HLSマニフェストダウンロード
storing(5-80%): HLSセグメント × N個をIrysに個別アップロード
  - 各セグメント: irys.uploadData(segmentData, segmentTags)
  - 進捗: (完了セグメント数 / 全セグメント数) × 75 + 5
storing(80-90%): サムネイル抽出・アップロード
storing(90-100%): メタデータJSON作成・アップロード
  - メタデータにsegmentCids、rendition情報、動画情報を含む
```

**セグメント保存のIrysタグ:**
```typescript
[
  { name: 'AppName', value: 'DecentralizedVideo' },
  { name: 'Content-Type', value: 'application/octet-stream' },
  { name: 'Type', value: 'video-segment' },
  { name: 'Creator', value: address },
]
```

#### Task 5: エラー表示UI

**トランスコード失敗時の表示:**
```
❌ トランスコードに失敗しました
原因: 動画フォーマットがサポートされていません
サポート形式: MP4 (H.264), WebM, MOV

[別の形式で再アップロード]
```

**Irys残高不足時の表示:**
```
❌ ストレージ残高が不足しています
必要額: 0.002 ETH | Irys残高: 0.0005 ETH

[残高を追加]  [アップロードをキャンセル]
```

「残高を追加」ボタンはStory 2.3（Irysデポジットページ）へのリンクとする。Story 2.3未実装の場合はボタンをdisabledにするか、メッセージのみ表示。

**パイプライン完了時の表示:**
```
✅ 動画が正常にアップロードされました！
分散型ウェブに永続保存されました。

[動画を見る]  [別の動画をアップロード]
```

### Previous Story Intelligence（Story 2.1/1.1からの学び）

**Story 1.1で確立された基盤（変更禁止）:**
- `types/errors.ts`: Result<T>, AppError, ErrorCategory
- `types/services.ts`: IrysService Interface（uploadData, getBalance, deposit, queryFiles, getMetadata）
- `types/pipeline.ts`: PipelineStage, PipelineState, PipelineAction
- `lib/compose-providers.tsx`: composeProviders
- `vitest.config.ts`: @/エイリアス同期済み

**Story 2.1で確立された基盤（利用・拡張）:**
- `lib/livepeer.ts`: LivepeerServiceImpl — Result型化済み。`waitForReady`と`downloadHlsManifest`は本ストーリーで使用
- `lib/pipeline-reducer.ts`: uploadPipelineReducer — ステージ遷移ロジック。変更不要（全ステージ対応済み）
- `hooks/usePipelineOrchestrator.ts`: uploading完了まで実装済み。**本ストーリーで拡張**
- `contexts/ServiceContext.tsx`: LivepeerService注入済み。**本ストーリーでIrysService追加**
- `components/video/TranscodeProgress.tsx`: PipelineState対応済み
- `components/video/VideoUploader.tsx`: usePipelineOrchestrator統合済み

**既存`video.ts`の参考箇所:**
- `uploadVideo`メソッド（行31-234）にHLSダウンロード→セグメント保存→メタデータ保存の完全フローが存在
- `extractAndUploadThumbnail`（行398-437）: サムネイル抽出パターン
- `calculateDuration`（行473-479）: HLS duration計算
- **注意:** `video.ts`の実装は旧パターン（throw、AbortSignalなし）。コードロジックは参考にするが、パターンはResult型に統一すること

**Irysタグの旧→新マッピング（既存コードからの変更点）:**

| 旧タグ名（video.ts） | 新タグ名（PascalCase統一） |
|---------------------|-------------------------|
| `App-Name` | `AppName` |
| `Content-Type` | `Content-Type`（例外: HTTP標準） |
| `Type` | `Type`（変更なし） |
| `Creator` | `Creator`（変更なし） |
| `Title` | `Title`（変更なし） |
| `Category` | `Category`（変更なし） |
| `AccessType` | `AccessType`（変更なし） |
| `Tag` | `Tag`（変更なし） |

### Git Intelligence

**直近コミットはStory 2.1作成時と同じ。追加分析不要。**

Story 2.1のdev-agentが実装中のため、Story 2.1の実装コミットが追加される予定。Story 2.2のdev-agentはStory 2.1完了後のコードベース上で作業する。

### Project Structure Notes

**新規ファイル（このストーリーで作成）:**
```
src/
  lib/
    irys.ts              ← 更新（IrysServiceImplリファクタ）
    irys.test.ts         ← 新規
  contexts/
    ServiceContext.tsx    ← 更新（IrysService追加）
  hooks/
    usePipelineOrchestrator.ts ← 更新（transcoding→storing→completed）
  components/video/
    VideoUploader.tsx     ← 更新（完了UI、エラー表示強化）
  lib/
    config.ts             ← 更新（IRYS_GRAPHQL_ENDPOINT追加）
    config.test.ts        ← 更新（新環境変数テスト追加）
.env.example              ← 更新（IRYS_GRAPHQL_ENDPOINT追加）
```

**変更禁止ファイル:**
- `src/types/errors.ts` — Story 1.1で定義済み
- `src/types/services.ts` — Story 1.1で定義済み（IrysService Interface）
- `src/types/pipeline.ts` — Story 1.1で定義済み
- `src/lib/pipeline-reducer.ts` — Story 2.1で実装済み（全ステージ対応済み）
- `vitest.config.ts` — Story 1.1で設定済み
- `playwright.config.ts` — Story 1.1で設定済み

**既存ファイルとの関係:**
- `src/lib/video.ts` — 既存の`videoService.uploadVideo()`はStory 2.2完了後に非推奨。ただしStory 2.2では直接変更しない（`queryVideos`等は別ストーリーで使用されるため）
- `src/hooks/useVideo.ts` — Story 2.2完了後に`usePipelineOrchestrator`が完全代替。ただしStory 2.2では直接変更しない
- `src/components/UploadForm.tsx` — 旧Lit暗号化フォーム。変更しない

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2] — Acceptance Criteria原文
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 3: API & Communication Patterns] — Result型、サービス層抽象化
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 4: Frontend Architecture] — Pipeline reducer + usePipelineOrchestrator分離
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — Irysタグ命名（PascalCase）、構造化ログ、テスト配置
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 5: Infrastructure & Deployment] — 環境変数Zodスキーマ
- [Source: _bmad-output/planning-artifacts/prd.md#FR11] — 自動トランスコード・ストリーミング保存
- [Source: _bmad-output/planning-artifacts/prd.md#FR13] — トランスコード失敗エラー表示
- [Source: _bmad-output/planning-artifacts/prd.md#FR14] — ストレージ残高不足エラー表示
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-I3] — プロトコル別タイムアウト（Irys: 15秒）
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-I4] — Irys GraphQLエンドポイント環境変数化
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-P5] — アップロード完了時間計測・記録
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Critical Success Moments] — 初回アップロード完了の重要性
- [Source: _bmad-output/implementation-artifacts/1-1-project-foundation-security-update.md] — Story 1.1基盤パターン
- [Source: _bmad-output/implementation-artifacts/2-1-video-upload-form-livepeer-tus.md] — Story 2.1基盤（LivepeerServiceImpl, pipeline-reducer, ServiceContext, usePipelineOrchestrator）

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
