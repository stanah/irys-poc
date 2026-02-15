import type { PipelineState, PipelineAction } from '@/types/pipeline';

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
    case 'STAGE_START': {
      if (state.stage === 'completed' || state.stage === 'cancelling') {
        console.warn(`[Pipeline] Invalid transition: ${state.stage} → STAGE_START(${action.stage})`);
        return state;
      }
      return { ...state, stage: action.stage, progress: 0, message: '', error: null };
    }
    case 'STAGE_COMPLETE': {
      if (state.stage === 'idle' || state.stage === 'failed' || state.stage === 'cancelling') {
        console.warn(`[Pipeline] Invalid transition: ${state.stage} → STAGE_COMPLETE(${action.stage})`);
        return state;
      }
      return { ...state, lastCompletedStage: action.stage, progress: 100 };
    }
    case 'PROGRESS_UPDATE':
      return { ...state, progress: action.progress, message: action.message };
    case 'STAGE_FAILED':
      return { ...state, stage: 'failed', error: action.error };
    case 'RETRY_FROM_STAGE': {
      if (state.stage !== 'failed') {
        console.warn(`[Pipeline] Invalid transition: ${state.stage} → RETRY_FROM_STAGE(${action.stage})`);
        return state;
      }
      return { ...state, stage: action.stage, progress: 0, error: null, retryCount: state.retryCount + 1 };
    }
    case 'CANCEL': {
      if (state.stage === 'idle' || state.stage === 'completed' || state.stage === 'failed') {
        console.warn(`[Pipeline] Invalid transition: ${state.stage} → CANCEL`);
        return state;
      }
      return { ...state, stage: 'cancelling' };
    }
    case 'RESET':
      return initialPipelineState;
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}
