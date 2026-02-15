export type ErrorCategory = 'lit' | 'irys' | 'livepeer' | 'wallet' | 'pipeline';

export type AppError = {
  category: ErrorCategory;
  code: string;
  message: string;
  retryable: boolean;
  cause?: unknown;
};

export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };
