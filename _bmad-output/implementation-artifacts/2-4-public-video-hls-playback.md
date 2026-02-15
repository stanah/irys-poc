# Story 2.4: 公開動画のHLS再生

Status: done

## Story

As a **ユーザー（ログイン不要）**,
I want **公開動画をブラウザ上でシームレスに視聴する**,
so that **ログインやウォレット接続なしでコンテンツを楽しめる**.

## Acceptance Criteria (BDD)

### AC1: 公開動画のHLS再生

**Given** 公開動画の視聴ページにアクセスした状態（ログイン不要）
**When** ページが読み込まれる
**Then** Irys Gateway経由でHLSマニフェストが取得され、hls.jsが再生を開始する（FR17）
**And** 再生開始時間が1秒以内である（NFR-P1、ブロードバンド環境）
**And** `[METRIC] event=playback_start, duration_ms=X, video_type=public`がログ出力される

### AC2: 動画詳細情報表示

**Given** 動画再生ページの状態
**When** 動画情報エリアを確認する
**Then** タイトル、説明、クリエイター情報（アドレス）が表示される（FR20）

### AC3: Livepeer障害時の既存動画再生

**Given** Livepeerが障害中の状態
**When** Irysに既に保存済みの公開動画を視聴する
**Then** 正常に再生される（NFR-I6 — Livepeer障害は新規アップロードのみブロック）

## Tasks / Subtasks

- [ ] **Task 1: VideoPlayerコンポーネントのリファクタリング** (AC: #1, #3)
  - [ ] 1.1 `src/components/video/VideoPlayer.tsx`を更新
  - [ ] 1.2 公開動画の再生パスを簡素化: Irys Gateway URLから直接HLSマニフェストを読み込み
  - [ ] 1.3 hls.jsの初期化: `hls.loadSource(`https://gateway.irys.xyz/${video.hlsManifestCid}`)` — Livepeer API呼び出しなし（NFR-I6準拠）
  - [ ] 1.4 Safari HLSネイティブサポート: `video.canPlayType('application/vnd.apple.mpegurl')`チェック → `<video src=...>`直接指定
  - [ ] 1.5 公開動画では暗号化/復号処理を完全スキップ（`accessType === 'public'`判定）
  - [ ] 1.6 `[METRIC]`構造化ログ: 再生開始時に`event=playback_start, duration_ms=X, video_type=public`
  - [ ] 1.7 再生開始時間の計測: `initializePlayer`開始→`MANIFEST_PARSED`イベントまでの`duration_ms`
  - [ ] 1.8 エラーハンドリング: HLS読み込みエラー時にユーザー向けメッセージ表示（AppErrorパターンは不要 — コンポーネント内部エラー）

- [ ] **Task 2: 視聴ページのServiceContext統合** (AC: #1, #2)
  - [ ] 2.1 `src/app/watch/[videoId]/page.tsx`を更新
  - [ ] 2.2 `videoService.getVideoMetadata(videoId)`を`useServiceContext().irys.getMetadata(videoId)`経由に変更
  - [ ] 2.3 getMetadataのResult型ハンドリング: `success: false`時にエラー表示
  - [ ] 2.4 メタデータのパース: Irys GraphQLレスポンスから`VideoMetadata`型への変換
  - [ ] 2.5 ログイン不要（公開動画）: `WalletContext`のconnected状態に依存しない表示
  - [ ] 2.6 動画詳細情報: タイトル、説明、クリエイターアドレス（短縮表示）、カテゴリ、タグ、公開日時
  - [ ] 2.7 既存のTippingWidget、Storage Infoセクションは維持

- [ ] **Task 3: useVideoMetadataフック作成** (AC: #1, #2)
  - [ ] 3.1 `src/hooks/useVideoMetadata.ts`を新規作成
  - [ ] 3.2 `useServiceContext()`経由でIrysServiceを取得
  - [ ] 3.3 `videoId`を引数に受け取り、`irys.getMetadata(videoId)`を呼び出し
  - [ ] 3.4 Irysメタデータ（JSONテキスト + タグ）から`VideoMetadata`型への変換ロジック
  - [ ] 3.5 `video`/`isLoading`/`error`を返却
  - [ ] 3.6 Result型ハンドリング: `success: false`時にerror設定

- [ ] **Task 4: IrysServiceImpl getMetadata実装** (AC: #1, #2)
  - [ ] 4.1 `src/lib/irys.ts`の`getMetadata`メソッドを実装
  - [ ] 4.2 Irys Gateway経由でトランザクションデータ取得: `https://gateway.irys.xyz/${transactionId}`
  - [ ] 4.3 トランザクションのタグ情報取得: GraphQL経由で`node.tags`を取得
  - [ ] 4.4 JSONパース + タグ情報のマージでメタデータ構築
  - [ ] 4.5 Result型パターン準拠
  - [ ] 4.6 タイムアウト15秒（NFR-I3）
  - [ ] 4.7 `[METRIC]`構造化ログ: `event=metadata_fetch, video_id=X, duration_ms=Y`

- [ ] **Task 5: 公開動画のウォレット非依存化** (AC: #1, #3)
  - [ ] 5.1 VideoPlayerが`address`/`walletClient`なしでも動作するよう修正
  - [ ] 5.2 公開動画パス: `accessType === 'public'`の場合、Litセッション取得・暗号化セグメント読み込みをスキップ
  - [ ] 5.3 視聴ページ: `isConnected`チェックを動画再生のブロック条件から除外（TippingWidgetの表示制御にのみ使用）
  - [ ] 5.4 ServiceContextの部分初期化: 公開動画再生にはIrysServiceのみ必要（LitService不要）
  - [ ] 5.5 Livepeer APIへの依存排除: 再生時にはLivepeer Studio APIを呼び出さない（Irys Gatewayからのみ取得）

- [ ] **Task 6: NFR-P1再生開始時間計測** (AC: #1)
  - [ ] 6.1 `performance.now()`でページロード→再生開始の精密計測
  - [ ] 6.2 計測ポイント: `initializePlayer()`呼び出し → `Hls.Events.MANIFEST_PARSED` → 最初のフレーム表示
  - [ ] 6.3 `[METRIC] event=playback_start, duration_ms=X, video_type=public, video_id=Y, timestamp=Z`
  - [ ] 6.4 1秒以上かかった場合の警告ログ: `[METRIC] event=playback_slow, duration_ms=X, threshold_ms=1000`
  - [ ] 6.5 Safariネイティブ再生の場合も同様に計測（`loadeddata`イベント使用）

- [ ] **Task 7: IrysServiceImplテスト** (AC: #1, #2)
  - [ ] 7.1 `src/lib/irys.test.ts`を更新
  - [ ] 7.2 getMetadata成功テスト: `Result<VideoMetadata>`が返る
  - [ ] 7.3 getMetadata不存在テスト: `{ success: false, error: { code: 'METADATA_NOT_FOUND' } }`
  - [ ] 7.4 getMetadataタイムアウトテスト

- [ ] **Task 8: 最終検証** (AC: #1-3)
  - [ ] 8.1 `pnpm build` — ゼロエラー
  - [ ] 8.2 `pnpm test` — 全テストパス
  - [ ] 8.3 `pnpm lint` — 変更ファイルゼロ警告
  - [ ] 8.4 `pnpm dev`で手動動作確認:
    - 公開動画視聴ページにログインなしでアクセス → HLS再生開始
    - タイトル・説明・クリエイター情報表示確認
    - DevToolsで`[METRIC] event=playback_start`ログ確認
    - `duration_ms`が1000以下であることを確認（ブロードバンド環境）

## Dev Notes

### 実装順序（依存関係に基づく）

**必ずこの順序で実装すること：**
1. **Task 4 (IrysServiceImpl getMetadata)** — メタデータ取得基盤。Task 3の前提
2. **Task 7 (テスト)** — Task 4完了後にテスト
3. **Task 3 (useVideoMetadata)** — Task 4に依存
4. **Task 5 (ウォレット非依存化)** — Task 1の前提条件を整理
5. **Task 1 (VideoPlayerリファクタ)** — 本ストーリーの中核。Task 5に依存
6. **Task 6 (NFR-P1計測)** — Task 1に依存
7. **Task 2 (視聴ページ更新)** — Task 1 + Task 3に依存
8. **Task 8 (最終検証)** — 全タスク完了後

### Story 2.1/2.2/2.3への依存関係（前提条件）

**前提ストーリーで実装済みの基盤:**

| コンポーネント | ファイル | 状態 | 使用方法 |
|--------------|--------|------|---------|
| `IrysServiceImpl` | `src/lib/irys.ts` | Story 2.2でResult型化済み | `getMetadata`を本ストーリーで実装 |
| `ServiceContext` | `src/contexts/ServiceContext.tsx` | IrysService注入済み | メタデータ取得に使用 |
| `VideoPlayer` | `src/components/video/VideoPlayer.tsx` | 既存（暗号化対応済み） | **公開動画パスを簡素化** |
| `WatchPage` | `src/app/watch/[videoId]/page.tsx` | 既存 | **ServiceContext統合** |
| 環境変数 | `src/lib/config.ts` | Story 2.3でIRYS_GRAPHQL_ENDPOINT追加済み | GraphQLクエリに使用 |
| 型定義 | `src/types/video.ts` | VideoMetadata, HLSManifest等 | 変更なし |

### Architecture Compliance（必須遵守ルール）

**命名規則:**
- 新規フック: `useVideoMetadata.ts`（`use`プレフィックス + camelCase）
- テストファイル: `.test.ts`（コロケーション）

**公開動画再生パスの設計原則:**

```
[ユーザー] → /watch/[videoId]
    │
    ├─ useVideoMetadata(videoId)
    │   └─ IrysService.getMetadata(videoId) → VideoMetadata
    │
    └─ VideoPlayer(video)
        │
        ├─ accessType === 'public'?
        │   ├─ YES: Irys Gateway直接再生（Livepeer API不使用）
        │   │   └─ hls.loadSource(`https://gateway.irys.xyz/${hlsManifestCid}`)
        │   │
        │   └─ NO: 暗号化パス（Story 4.4で実装）
        │       └─ LitService.decrypt() → カスタムローダー
        │
        └─ [METRIC] playback_start ログ出力
```

**NFR-I6準拠（Livepeer障害耐性）:**
- 公開動画の再生パスにLivepeer Studio APIへの呼び出しを含めない
- HLSマニフェスト・セグメントはすべてIrys Gateway経由で取得
- Livepeer障害は新規アップロード（Story 2.1/2.2）にのみ影響

**NFR-P1準拠（再生開始1秒以内）:**
- hls.jsの`lowLatencyMode: false`（VoDに最適化）
- `enableWorker: true`（デコード並列化）
- Irys GatewayのCDNキャッシュを活用（初回は遅い可能性あり — 計測で判断）
- マニフェストパース完了→最初のセグメント取得→デコード開始を1秒以内に

**ローディング状態パターン:**
| 場面 | 状態変数名 | UI表現 |
|------|----------|--------|
| メタデータフェッチ | `isLoading` | Skeleton UI |
| 動画再生準備 | `isLoading`（VideoPlayer内部） | スピナーオーバーレイ |

**構造化ログフォーマット:**
```
[METRIC] event=metadata_fetch, video_id=X, duration_ms=Y, timestamp=Z
[METRIC] event=playback_start, duration_ms=X, video_type=public, video_id=Y, timestamp=Z
[METRIC] event=playback_slow, duration_ms=X, threshold_ms=1000, video_id=Y, timestamp=Z
```

### Technical Requirements

#### Task 1: VideoPlayerリファクタリング

**現行コードの問題:**
- 公開動画でも`videoService.getDecryptionAccess()`を呼び出している
- `videoService.loadEncryptedSegments()`がRendition依存（暗号化前提）
- 公開動画の直接再生パスが`if (video.accessType === "public" && video.hlsManifestCid)`の条件分岐内にあるが、暗号化ローダー（`createCustomLoader`）経由で動作している
- Livepeer API依存が暗黙的に存在（`videoService`経由）

**リファクタリング方針:**

```typescript
const initializePlayer = useCallback(async () => {
  if (!videoRef.current) return;

  setIsLoading(true);
  setError(null);

  const startTime = performance.now();

  try {
    if (video.accessType === 'public') {
      // ===== 公開動画パス（Livepeer非依存） =====
      const hlsUrl = `https://gateway.irys.xyz/${video.hlsManifestCid}`;

      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });

        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const durationMs = Math.round(performance.now() - startTime);
          console.log(`[METRIC] event=playback_start, duration_ms=${durationMs}, video_type=public, video_id=${video.id}, timestamp=${new Date().toISOString()}`);

          if (durationMs > 1000) {
            console.log(`[METRIC] event=playback_slow, duration_ms=${durationMs}, threshold_ms=1000, video_id=${video.id}, timestamp=${new Date().toISOString()}`);
          }

          setIsLoading(false);
          if (autoPlay) videoRef.current?.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setError('動画の読み込みに失敗しました。再試行してください。');
            onError?.(data.details || 'Playback error');
          }
        });

        hlsRef.current = hls;
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari ネイティブHLS
        videoRef.current.src = hlsUrl;

        videoRef.current.addEventListener('loadeddata', () => {
          const durationMs = Math.round(performance.now() - startTime);
          console.log(`[METRIC] event=playback_start, duration_ms=${durationMs}, video_type=public, video_id=${video.id}, timestamp=${new Date().toISOString()}`);
          setIsLoading(false);
        }, { once: true });
      } else {
        throw new Error('お使いのブラウザではHLS再生がサポートされていません');
      }
    } else {
      // ===== 限定動画パス（Story 4.4で実装） =====
      // 既存の暗号化パスを維持（一旦コメントまたはプレースホルダー）
      setError('限定動画の再生は現在準備中です');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '動画の読み込みに失敗しました';
    setError(message);
    onError?.(message);
    setIsLoading(false);
  }
}, [video, autoPlay, onError]);
```

**重要:** 公開動画パスは`address`/`walletClient`に一切依存しない。`useWalletContext()`の呼び出しは残すが（限定動画用）、公開動画パスでは使用しない。

#### Task 2: 視聴ページ更新

**変更方針:**
- `videoService.getVideoMetadata(videoId)` → `useVideoMetadata(videoId)` に置き換え
- `videoService`のimportを除去（このページではServiceContext経由のみ使用）
- メタデータ取得のResult型ハンドリング

**メタデータ取得フロー:**
```
1. useVideoMetadata(videoId)
2. → IrysService.getMetadata(videoId)
3. → Irys Gateway: GET https://gateway.irys.xyz/{videoId}（JSONデータ取得）
4. → Irys GraphQL: タグ情報取得（バックアップ）
5. → VideoMetadata型に変換
```

#### Task 4: IrysServiceImpl getMetadata

**`getMetadata`実装方針:**

```typescript
async getMetadata(
  transactionId: string,
  options?: { signal?: AbortSignal }
): Promise<Result<unknown>> {
  if (options?.signal?.aborted) {
    return { success: false, error: {
      category: 'irys', code: 'ABORTED',
      message: '操作がキャンセルされました', retryable: true
    }};
  }

  const startTime = Date.now();

  try {
    // 1. Irys GatewayからJSONデータ取得
    const response = await fetch(
      `https://gateway.irys.xyz/${transactionId}`,
      {
        signal: options?.signal,
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: {
          category: 'irys', code: 'METADATA_NOT_FOUND',
          message: 'メタデータが見つかりません', retryable: false
        }};
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const metadata = await response.json();

    const durationMs = Date.now() - startTime;
    console.log(`[METRIC] event=metadata_fetch, video_id=${transactionId}, duration_ms=${durationMs}, timestamp=${new Date().toISOString()}`);

    return { success: true, data: metadata };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { success: false, error: {
        category: 'irys', code: 'ABORTED',
        message: '操作がキャンセルされました', retryable: true
      }};
    }
    return { success: false, error: {
      category: 'irys', code: 'METADATA_FETCH_FAILED',
      message: 'メタデータの取得に失敗しました', retryable: true, cause: e
    }};
  }
}
```

**注意:** `getMetadata`はIrys Gateway（`gateway.irys.xyz`）を使用。Irys Uploader API（`uploader.irys.xyz`）ではない。GatewayはCDNキャッシュされるため高速。

**AppErrorコード一覧（追加分）:**

| code | message | retryable | 発生箇所 |
|------|---------|-----------|---------|
| `METADATA_NOT_FOUND` | メタデータが見つかりません | false | getMetadata |
| `METADATA_FETCH_FAILED` | メタデータの取得に失敗しました | true | getMetadata |

#### Task 5: 公開動画ウォレット非依存化

**VideoPlayerの依存関係整理:**

| 依存 | 公開動画 | 限定動画 |
|------|---------|---------|
| `useWalletContext()` | 不要（呼び出しは残すが未使用） | 必要（Litセッション用） |
| `videoService` | 不要 | Story 4.4で使用 |
| `decryptSegment` | 不要 | Story 4.4で使用 |
| Irys Gateway | 必要（HLS取得） | 必要（暗号化データ取得） |
| Livepeer API | **不要**（NFR-I6） | **不要**（再生時はIrysのみ） |

**ServiceContextの公開動画サポート:**
```typescript
// 視聴ページはServiceProvider配下で動作
// 公開動画ではIrysServiceのみ使用、LitServiceは不要
// ServiceContextにLitServiceが未初期化でもエラーにならない設計
```

### Previous Story Intelligence（Story 2.1/2.2/2.3からの学び）

**Story 1.1で確立された基盤（変更禁止）:**
- `types/errors.ts`: Result<T>, AppError, ErrorCategory
- `types/services.ts`: IrysService Interface（getMetadata定義済み）
- `types/video.ts`: VideoMetadata, HLSManifest等

**Story 2.2で確立された基盤:**
- `lib/irys.ts`: IrysServiceImpl Result型化済み。`getMetadata`は本ストーリーで実装
- Irysタグ: PascalCase統一（`AppName`, `Title`, `Category`等）
- StoringステージでIrysに保存されるメタデータJSON構造を参照すること

**Story 2.3で確立された基盤:**
- `lib/config.ts`: `IRYS_GRAPHQL_ENDPOINT`環境変数追加済み
- `useServiceContext()`: IrysService取得パターン

**既存`VideoPlayer.tsx`について:**
- 現行は公開/限定の区別なく暗号化ローダー（`createCustomLoader`）を経由
- 公開動画パス（`video.hlsManifestCid`直接読み込み）はhls.js内部で処理されるが、不要な暗号化チェックが走る
- このストーリーで公開動画パスを明確に分離し、暗号化関連コードをスキップ

**既存`WatchPage`について:**
- 現行は`videoService.getVideoMetadata(videoId)`で直接呼び出し（旧パターン）
- このストーリーで`useVideoMetadata`フック + ServiceContext経由に変更
- TippingWidgetとStorage Infoセクションは既存のまま維持

### Git Intelligence

**直近コミット分析はStory 2.2と同一。**

Story 2.1/2.2/2.3のdev-agentが実装中のため、これらの実装コミットが前提条件。

### Project Structure Notes

**新規ファイル（このストーリーで作成）:**
```
src/
  hooks/
    useVideoMetadata.ts         ← 新規
  lib/
    irys.ts                     ← 更新（getMetadata実装）
    irys.test.ts                ← 更新（getMetadataテスト追加）
  components/video/
    VideoPlayer.tsx             ← 更新（公開動画パス簡素化）
  app/watch/[videoId]/
    page.tsx                    ← 更新（ServiceContext統合）
```

**変更禁止ファイル:**
- `src/types/errors.ts` — Story 1.1で定義済み
- `src/types/services.ts` — Story 1.1で定義済み
- `src/types/video.ts` — 既存型は共存
- `src/types/pipeline.ts` — Story 1.1で定義済み
- `src/lib/pipeline-reducer.ts` — Story 2.1で実装済み
- `vitest.config.ts` — Story 1.1で設定済み
- `src/lib/config.ts` — Story 2.3で更新済み（変更不要）

**既存ファイルとの関係:**
- `src/lib/video.ts` — 既存の`videoService.getVideoMetadata()`は視聴ページから参照されなくなる。ただしファイル自体は変更しない（他の箇所で使用の可能性）
- `src/lib/encryption.ts` — 限定動画パスで使用（Story 4.4）。公開動画パスでは不要
- `src/hooks/useVideo.ts` — トップページで使用中。変更しない
- `src/components/video/VideoCard.tsx` — 変更しない

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4] — Acceptance Criteria原文
- [Source: _bmad-output/planning-artifacts/architecture.md#Category 3: API & Communication Patterns] — Result型、サービス層抽象化
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns] — パイプライン独立性（公開動画はLit非依存）
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules] — 構造化ログ、ローディング状態パターン
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — パイプライン境界（公開動画再生: Irys Gateway → hls.js）
- [Source: _bmad-output/planning-artifacts/prd.md#FR17] — 公開動画のログイン不要視聴
- [Source: _bmad-output/planning-artifacts/prd.md#FR20] — 動画詳細情報閲覧
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-P1] — 公開動画再生開始1秒以内
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-I3] — プロトコル別タイムアウト（Irys: 15秒）
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-I6] — Livepeer障害時のIrys保存済み動画再生
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Foundation Experience] — 公開動画視聴がFoundation Experience
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Effortless Interactions] — URLアクセス→即再生（ログイン不要）
- [Source: _bmad-output/implementation-artifacts/2-2-transcode-irys-storage.md] — IrysServiceImplリファクタ、Irysメタデータ保存構造
- [Source: _bmad-output/implementation-artifacts/2-3-irys-deposit-creator-video-list.md] — IrysServiceImpl GraphQLクエリ、getMetadata

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
