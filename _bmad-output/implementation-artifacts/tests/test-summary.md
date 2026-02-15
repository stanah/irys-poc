# テスト自動化サマリー

**生成日**: 2026-02-15
**プロジェクト**: irys-poc (DecentralizedVideo)
**フレームワーク**: Vitest v4.0.18 (ユニット) + Playwright v1.58.2 (E2E)

## 生成されたテスト

### 新規ユニットテスト

- [x] `src/hooks/useVideo.test.ts` — ビデオアップロード・取得フック (11テスト)
  - アップロード成功/失敗/ウォレット未接続
  - ビデオ一覧取得・フィルタパラメータ
  - 個別ビデオメタデータ取得
  - 復号アクセス確認
- [x] `src/hooks/useTranscode.test.ts` — トランスコードポーリングフック (9テスト)
  - ポーリング開始/停止
  - ready/failed ステータスでの自動停止
  - 5秒間隔のポーリング確認
  - エラーハンドリング
  - ポーリング再開時の既存ポーリング停止
- [x] `src/components/video/VideoCard.test.tsx` — VideoCardコンポーネント (18テスト)
  - タイトル・リンク・サムネイル・カテゴリ表示
  - formatDuration: 秒→mm:ss / h:mm:ss 変換
  - formatDate: 相対時間表示 (minutes, hours, days, weeks)
  - アクセスタイプアイコン (public/token-gated/subscription)
  - チップ表示 (ETH)

### 既存テスト

- [x] `src/lib/config.test.ts` — 環境変数バリデーション (18テスト)
- [x] `src/lib/encryption.test.ts` — アクセス制御条件 (9テスト)
- [x] `src/hooks/useWallet.test.ts` — ウォレット接続フック (17テスト)
- [x] `src/app/api/videos/route.test.ts` — Video API (8テスト)
- [x] `src/lib/compose-providers.test.tsx` — プロバイダ合成 (3テスト)
- [x] `src/lib/video.test.ts` — VideoService (10テスト)
- [x] `src/lib/livepeer.test.ts` — LivepeerService (10テスト)

### E2Eテスト

- [x] `tests/e2e/smoke.spec.ts` — ホームページスモークテスト (1テスト)

## カバレッジ

| カテゴリ | テスト済み | 合計 | カバー率 |
|---------|-----------|------|---------|
| Hooks | 3/3 | 3 | 100% |
| Lib/Service | 5/7 | 7 | 71% |
| Components | 1/7 | 7 | 14% |
| API Routes | 1/1 | 1 | 100% |
| E2E | 1 | — | スモークのみ |

**合計**: 113テスト (10ファイル) — 全パス

### 未テストファイル (理由付き)

| ファイル | 理由 |
|---------|------|
| `src/lib/lit.ts` | ブラウザAPI (`window.location`) + 外部Lit Protocol SDK依存。E2Eテスト推奨 |
| `src/lib/irys.ts` | `window.ethereum` + MetaMask依存。E2Eテスト推奨 |
| `src/components/Login.tsx` | Context依存のUIコンポーネント。Integration/E2E推奨 |
| `src/components/UploadForm.tsx` | 複雑なフォーム。E2Eテスト推奨 |
| `src/components/video/VideoPlayer.tsx` | HLS.js + メディア再生。E2Eテスト推奨 |
| `src/components/video/VideoUploader.tsx` | ファイルアップロードUI。E2Eテスト推奨 |
| `src/types/*.ts` | 純粋な型定義。テスト不要 |

## 次のステップ

- CIでのテスト実行設定
- `lit.ts` / `irys.ts` のE2Eカバレッジ追加
- Loginコンポーネントのインテグレーションテスト
- カバレッジレポート (`vitest --coverage`) の導入
