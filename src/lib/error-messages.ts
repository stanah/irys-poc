import type { AppError } from '@/types/errors';

export interface ErrorAction {
  label: string;
  href?: string;
  action: 'retry' | 'reset' | 'navigate';
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
    TIMEOUT: '操作がタイムアウトしました。再試行してください。',
    ABORTED: '操作がキャンセルされました。',
    PLAYBACK_INFO_FAILED: '再生情報の取得に失敗しました。再試行してください。',
    HLS_URL_NOT_AVAILABLE: 'HLS URLが利用できません。再試行してください。',
    MASTER_PLAYLIST_FAILED: 'マスタープレイリストの取得に失敗しました。再試行してください。',
    HLS_DOWNLOAD_FAILED: 'HLSマニフェストのダウンロードに失敗しました。再試行してください。',
  },
  irys: {
    WALLET_REQUIRED: 'MetaMaskまたは互換ウォレットが必要です。',
    INIT_FAILED: 'Irysストレージへの接続に失敗しました。再試行してください。',
    INSUFFICIENT_FUNDS: 'ストレージ残高が不足しています。デポジットしてから再試行してください。',
    UPLOAD_FAILED: 'Irysへのアップロードに失敗しました。再試行してください。',
    QUERY_FAILED: '動画一覧の取得に失敗しました。再試行してください。',
    METADATA_NOT_FOUND: 'メタデータが見つかりません。',
    METADATA_FETCH_FAILED: 'メタデータの取得に失敗しました。再試行してください。',
    DEPOSIT_FAILED: 'デポジットに失敗しました。再試行してください。',
    INVALID_AMOUNT: '無効なデポジット額です。',
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
    API_KEY_MISSING: { label: '設定を確認', action: 'reset' },
  },
  pipeline: {
    MAX_RETRIES_EXCEEDED: { label: '最初からやり直す', action: 'reset' },
  },
};

export function getErrorMessage(error: AppError): string {
  return ERROR_MESSAGES[error.category]?.[error.code] ?? error.message;
}

export function getErrorAction(error: AppError): ErrorAction | null {
  return ERROR_ACTIONS[error.category]?.[error.code] ?? null;
}
