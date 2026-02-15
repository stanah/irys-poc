import { describe, it, expect, vi } from 'vitest';
import { uploadPipelineReducer, initialPipelineState } from './pipeline-reducer';
import type { PipelineState } from '@/types/pipeline';
import type { AppError } from '@/types/errors';

describe('uploadPipelineReducer', () => {
  describe('初期状態', () => {
    it('idle状態で初期化される', () => {
      expect(initialPipelineState).toEqual({
        stage: 'idle',
        progress: 0,
        message: '',
        error: null,
        retryCount: 0,
        lastCompletedStage: null,
      });
    });
  });

  describe('STAGE_START', () => {
    it('idle → preparing へ遷移する', () => {
      const result = uploadPipelineReducer(initialPipelineState, {
        type: 'STAGE_START',
        stage: 'preparing',
      });
      expect(result.stage).toBe('preparing');
      expect(result.progress).toBe(0);
      expect(result.message).toBe('');
      expect(result.error).toBeNull();
    });

    it('preparing → uploading へ遷移する', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'preparing',
        progress: 100,
      };
      const result = uploadPipelineReducer(state, {
        type: 'STAGE_START',
        stage: 'uploading',
      });
      expect(result.stage).toBe('uploading');
      expect(result.progress).toBe(0);
    });

    it('uploading → transcoding へ遷移する', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'uploading',
        progress: 100,
      };
      const result = uploadPipelineReducer(state, {
        type: 'STAGE_START',
        stage: 'transcoding',
      });
      expect(result.stage).toBe('transcoding');
      expect(result.progress).toBe(0);
    });
  });

  describe('STAGE_COMPLETE', () => {
    it('完了ステージを記録しprogressを100にする', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'preparing',
        progress: 50,
      };
      const result = uploadPipelineReducer(state, {
        type: 'STAGE_COMPLETE',
        stage: 'preparing',
      });
      expect(result.lastCompletedStage).toBe('preparing');
      expect(result.progress).toBe(100);
    });

    it('uploading完了を記録する', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'uploading',
        progress: 99,
      };
      const result = uploadPipelineReducer(state, {
        type: 'STAGE_COMPLETE',
        stage: 'uploading',
      });
      expect(result.lastCompletedStage).toBe('uploading');
      expect(result.progress).toBe(100);
    });
  });

  describe('PROGRESS_UPDATE', () => {
    it('進捗とメッセージを更新する', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'uploading',
      };
      const result = uploadPipelineReducer(state, {
        type: 'PROGRESS_UPDATE',
        stage: 'uploading',
        progress: 42,
        message: 'アップロード中... 42%',
      });
      expect(result.progress).toBe(42);
      expect(result.message).toBe('アップロード中... 42%');
    });

    it('0%から100%まで更新できる', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'uploading',
      };
      const result = uploadPipelineReducer(state, {
        type: 'PROGRESS_UPDATE',
        stage: 'uploading',
        progress: 100,
        message: 'アップロード完了',
      });
      expect(result.progress).toBe(100);
    });
  });

  describe('CANCEL', () => {
    it('uploading → cancelling へ遷移する', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'uploading',
        progress: 50,
      };
      const result = uploadPipelineReducer(state, { type: 'CANCEL' });
      expect(result.stage).toBe('cancelling');
    });

    it('preparing → cancelling へ遷移する', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'preparing',
      };
      const result = uploadPipelineReducer(state, { type: 'CANCEL' });
      expect(result.stage).toBe('cancelling');
    });
  });

  describe('STAGE_FAILED', () => {
    it('failed状態に遷移しエラー情報を保持する', () => {
      const error: AppError = {
        category: 'livepeer',
        code: 'UPLOAD_FAILED',
        message: '動画のアップロードに失敗しました',
        retryable: true,
      };
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'uploading',
        progress: 30,
      };
      const result = uploadPipelineReducer(state, {
        type: 'STAGE_FAILED',
        error,
      });
      expect(result.stage).toBe('failed');
      expect(result.error).toEqual(error);
    });

    it('retryableフラグを正しく保持する', () => {
      const error: AppError = {
        category: 'livepeer',
        code: 'API_KEY_MISSING',
        message: 'Livepeer APIキーが設定されていません',
        retryable: false,
      };
      const result = uploadPipelineReducer(initialPipelineState, {
        type: 'STAGE_FAILED',
        error,
      });
      expect(result.error?.retryable).toBe(false);
    });
  });

  describe('RETRY_FROM_STAGE', () => {
    it('failed状態から指定ステージへ遷移しretryCountをインクリメントする', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'failed',
        error: {
          category: 'livepeer',
          code: 'UPLOAD_FAILED',
          message: '動画のアップロードに失敗しました',
          retryable: true,
        },
        retryCount: 0,
      };
      const result = uploadPipelineReducer(state, {
        type: 'RETRY_FROM_STAGE',
        stage: 'uploading',
      });
      expect(result.stage).toBe('uploading');
      expect(result.progress).toBe(0);
      expect(result.error).toBeNull();
      expect(result.retryCount).toBe(1);
    });

    it('複数回リトライするとretryCountが蓄積する', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'failed',
        retryCount: 2,
      };
      const result = uploadPipelineReducer(state, {
        type: 'RETRY_FROM_STAGE',
        stage: 'preparing',
      });
      expect(result.retryCount).toBe(3);
    });

    it('RETRY_FROM_STAGE時にerrorがnull化される', () => {
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'failed',
        error: {
          category: 'irys',
          code: 'UPLOAD_FAILED',
          message: 'Irysへのアップロードに失敗しました',
          retryable: true,
        },
        retryCount: 0,
      };
      const result = uploadPipelineReducer(state, {
        type: 'RETRY_FROM_STAGE',
        stage: 'storing',
      });
      expect(result.error).toBeNull();
    });
  });

  describe('RESET', () => {
    it('初期状態へ復帰する', () => {
      const state: PipelineState = {
        stage: 'failed',
        progress: 50,
        message: 'エラー発生',
        error: {
          category: 'livepeer',
          code: 'UPLOAD_FAILED',
          message: '動画のアップロードに失敗しました',
          retryable: true,
        },
        retryCount: 3,
        lastCompletedStage: 'preparing',
      };
      const result = uploadPipelineReducer(state, { type: 'RESET' });
      expect(result).toEqual(initialPipelineState);
    });
  });

  describe('不正遷移ガード', () => {
    it('completed → STAGE_STARTが拒否される', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'completed',
      };
      const result = uploadPipelineReducer(state, {
        type: 'STAGE_START',
        stage: 'uploading',
      });
      expect(result.stage).toBe('completed');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid transition: completed → STAGE_START')
      );
      warnSpy.mockRestore();
    });

    it('cancelling → STAGE_STARTが拒否される', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'cancelling',
      };
      const result = uploadPipelineReducer(state, {
        type: 'STAGE_START',
        stage: 'preparing',
      });
      expect(result.stage).toBe('cancelling');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('idle → RETRY_FROM_STAGEが拒否される', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = uploadPipelineReducer(initialPipelineState, {
        type: 'RETRY_FROM_STAGE',
        stage: 'uploading',
      });
      expect(result.stage).toBe('idle');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid transition: idle → RETRY_FROM_STAGE')
      );
      warnSpy.mockRestore();
    });

    it('completed → RETRY_FROM_STAGEが拒否される', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'completed',
      };
      const result = uploadPipelineReducer(state, {
        type: 'RETRY_FROM_STAGE',
        stage: 'preparing',
      });
      expect(result.stage).toBe('completed');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('idle → CANCELが拒否される', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = uploadPipelineReducer(initialPipelineState, { type: 'CANCEL' });
      expect(result.stage).toBe('idle');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid transition: idle → CANCEL')
      );
      warnSpy.mockRestore();
    });

    it('completed → CANCELが拒否される', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'completed',
      };
      const result = uploadPipelineReducer(state, { type: 'CANCEL' });
      expect(result.stage).toBe('completed');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('failed → CANCELが拒否される', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'failed',
      };
      const result = uploadPipelineReducer(state, { type: 'CANCEL' });
      expect(result.stage).toBe('failed');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('idle → STAGE_COMPLETEが拒否される', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = uploadPipelineReducer(initialPipelineState, {
        type: 'STAGE_COMPLETE',
        stage: 'preparing',
      });
      expect(result.stage).toBe('idle');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('failed → STAGE_COMPLETEが拒否される', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'failed',
      };
      const result = uploadPipelineReducer(state, {
        type: 'STAGE_COMPLETE',
        stage: 'uploading',
      });
      expect(result.stage).toBe('failed');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('cancelling → STAGE_COMPLETEが拒否される', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const state: PipelineState = {
        ...initialPipelineState,
        stage: 'cancelling',
      };
      const result = uploadPipelineReducer(state, {
        type: 'STAGE_COMPLETE',
        stage: 'uploading',
      });
      expect(result.stage).toBe('cancelling');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('正常系フルパス（公開動画）', () => {
    it('idle → preparing → uploading → transcoding → storing → completed の遷移が正しく動作する', () => {
      let state = initialPipelineState;

      // idle → preparing
      state = uploadPipelineReducer(state, { type: 'STAGE_START', stage: 'preparing' });
      expect(state.stage).toBe('preparing');

      // preparing complete
      state = uploadPipelineReducer(state, { type: 'STAGE_COMPLETE', stage: 'preparing' });
      expect(state.lastCompletedStage).toBe('preparing');

      // preparing → uploading
      state = uploadPipelineReducer(state, { type: 'STAGE_START', stage: 'uploading' });
      expect(state.stage).toBe('uploading');
      expect(state.progress).toBe(0);

      // progress updates
      state = uploadPipelineReducer(state, {
        type: 'PROGRESS_UPDATE',
        stage: 'uploading',
        progress: 50,
        message: 'アップロード中... 50%',
      });
      expect(state.progress).toBe(50);

      // uploading complete
      state = uploadPipelineReducer(state, { type: 'STAGE_COMPLETE', stage: 'uploading' });
      expect(state.lastCompletedStage).toBe('uploading');
      expect(state.progress).toBe(100);

      // uploading → transcoding
      state = uploadPipelineReducer(state, { type: 'STAGE_START', stage: 'transcoding' });
      expect(state.stage).toBe('transcoding');

      // transcoding complete
      state = uploadPipelineReducer(state, { type: 'STAGE_COMPLETE', stage: 'transcoding' });
      expect(state.lastCompletedStage).toBe('transcoding');

      // transcoding → storing
      state = uploadPipelineReducer(state, { type: 'STAGE_START', stage: 'storing' });
      expect(state.stage).toBe('storing');

      // storing complete
      state = uploadPipelineReducer(state, { type: 'STAGE_COMPLETE', stage: 'storing' });
      expect(state.lastCompletedStage).toBe('storing');

      // storing → completed
      state = uploadPipelineReducer(state, { type: 'STAGE_START', stage: 'completed' });
      expect(state.stage).toBe('completed');
    });
  });

  describe('リトライフルパス', () => {
    it('uploading失敗 → リトライ → 成功のフルフローが動作する', () => {
      let state = initialPipelineState;

      // normal flow to uploading
      state = uploadPipelineReducer(state, { type: 'STAGE_START', stage: 'preparing' });
      state = uploadPipelineReducer(state, { type: 'STAGE_COMPLETE', stage: 'preparing' });
      state = uploadPipelineReducer(state, { type: 'STAGE_START', stage: 'uploading' });

      // uploading fails
      state = uploadPipelineReducer(state, {
        type: 'STAGE_FAILED',
        error: {
          category: 'livepeer',
          code: 'UPLOAD_FAILED',
          message: '動画のアップロードに失敗しました',
          retryable: true,
        },
      });
      expect(state.stage).toBe('failed');
      expect(state.retryCount).toBe(0);

      // retry from uploading
      state = uploadPipelineReducer(state, {
        type: 'RETRY_FROM_STAGE',
        stage: 'uploading',
      });
      expect(state.stage).toBe('uploading');
      expect(state.retryCount).toBe(1);
      expect(state.error).toBeNull();
      expect(state.progress).toBe(0);
    });
  });
});
