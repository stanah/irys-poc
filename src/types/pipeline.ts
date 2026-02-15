import type { AppError } from './errors';

export type PipelineStage =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'transcoding'
  | 'encrypting'
  | 'storing'
  | 'completed'
  | 'failed'
  | 'cancelling';

export type PipelineState = {
  stage: PipelineStage;
  progress: number;
  message: string;
  error: AppError | null;
  retryCount: number;
  lastCompletedStage: PipelineStage | null;
};

export type PipelineAction =
  | { type: 'STAGE_START'; stage: PipelineStage }
  | { type: 'STAGE_COMPLETE'; stage: PipelineStage }
  | { type: 'PROGRESS_UPDATE'; stage: PipelineStage; progress: number; message: string }
  | { type: 'STAGE_FAILED'; error: AppError }
  | { type: 'RETRY_FROM_STAGE'; stage: PipelineStage }
  | { type: 'CANCEL' }
  | { type: 'RESET' };
