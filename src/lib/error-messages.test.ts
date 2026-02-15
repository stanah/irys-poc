import { describe, it, expect } from 'vitest';
import { getErrorMessage, getErrorAction } from './error-messages';
import type { AppError } from '@/types/errors';

describe('error-messages', () => {
  describe('getErrorMessage', () => {
    it('livepeerカテゴリの全コードに日本語メッセージを返す', () => {
      const codes = [
        'API_KEY_MISSING',
        'CREATE_ASSET_FAILED',
        'NO_TUS_ENDPOINT',
        'UPLOAD_FAILED',
        'UPLOAD_CANCELLED',
        'ASSET_NOT_FOUND',
        'TRANSCODE_FAILED',
        'TRANSCODE_TIMEOUT',
        'ABORTED',
      ];

      for (const code of codes) {
        const error: AppError = {
          category: 'livepeer',
          code,
          message: 'fallback',
          retryable: true,
        };
        const msg = getErrorMessage(error);
        expect(msg).not.toBe('fallback');
        expect(msg.length).toBeGreaterThan(0);
      }
    });

    it('irysカテゴリの全コードに日本語メッセージを返す', () => {
      const codes = [
        'WALLET_REQUIRED',
        'INIT_FAILED',
        'INSUFFICIENT_FUNDS',
        'UPLOAD_FAILED',
        'QUERY_FAILED',
        'METADATA_NOT_FOUND',
        'DEPOSIT_FAILED',
        'ABORTED',
      ];

      for (const code of codes) {
        const error: AppError = {
          category: 'irys',
          code,
          message: 'fallback',
          retryable: true,
        };
        const msg = getErrorMessage(error);
        expect(msg).not.toBe('fallback');
        expect(msg.length).toBeGreaterThan(0);
      }
    });

    it('pipelineカテゴリのMAX_RETRIES_EXCEEDEDに日本語メッセージを返す', () => {
      const error: AppError = {
        category: 'pipeline',
        code: 'MAX_RETRIES_EXCEEDED',
        message: 'fallback',
        retryable: false,
      };
      const msg = getErrorMessage(error);
      expect(msg).toContain('再試行回数の上限');
    });

    it('walletカテゴリのコードに日本語メッセージを返す', () => {
      const error: AppError = {
        category: 'wallet',
        code: 'NOT_CONNECTED',
        message: 'fallback',
        retryable: false,
      };
      const msg = getErrorMessage(error);
      expect(msg).toContain('ウォレット');
    });

    it('未知のコードに対してデフォルト（error.message）を返す', () => {
      const error: AppError = {
        category: 'livepeer',
        code: 'UNKNOWN_CODE',
        message: 'Some unknown error',
        retryable: false,
      };
      expect(getErrorMessage(error)).toBe('Some unknown error');
    });

    it('未知のカテゴリに対してデフォルト（error.message）を返す', () => {
      const error: AppError = {
        category: 'lit' as AppError['category'],
        code: 'SOME_ERROR',
        message: 'Lit error fallback',
        retryable: false,
      };
      expect(getErrorMessage(error)).toBe('Lit error fallback');
    });
  });

  describe('getErrorAction', () => {
    it('INSUFFICIENT_FUNDSに対してnavigateアクションを返す', () => {
      const error: AppError = {
        category: 'irys',
        code: 'INSUFFICIENT_FUNDS',
        message: '',
        retryable: false,
      };
      const action = getErrorAction(error);
      expect(action).not.toBeNull();
      expect(action!.label).toBe('残高を追加');
      expect(action!.href).toBe('/my-videos');
      expect(action!.action).toBe('navigate');
    });

    it('TRANSCODE_FAILEDに対してresetアクションを返す', () => {
      const error: AppError = {
        category: 'livepeer',
        code: 'TRANSCODE_FAILED',
        message: '',
        retryable: false,
      };
      const action = getErrorAction(error);
      expect(action).not.toBeNull();
      expect(action!.label).toBe('別の形式で再アップロード');
      expect(action!.action).toBe('reset');
    });

    it('MAX_RETRIES_EXCEEDEDに対してresetアクションを返す', () => {
      const error: AppError = {
        category: 'pipeline',
        code: 'MAX_RETRIES_EXCEEDED',
        message: '',
        retryable: false,
      };
      const action = getErrorAction(error);
      expect(action).not.toBeNull();
      expect(action!.label).toBe('最初からやり直す');
      expect(action!.action).toBe('reset');
    });

    it('アクション未定義のエラーにはnullを返す', () => {
      const error: AppError = {
        category: 'livepeer',
        code: 'UPLOAD_FAILED',
        message: '',
        retryable: true,
      };
      expect(getErrorAction(error)).toBeNull();
    });

    it('未知のカテゴリにはnullを返す', () => {
      const error: AppError = {
        category: 'lit' as AppError['category'],
        code: 'SOME_ERROR',
        message: '',
        retryable: false,
      };
      expect(getErrorAction(error)).toBeNull();
    });
  });
});
