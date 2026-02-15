"use client";

import Link from 'next/link';
import type { AppError } from '@/types/errors';
import { getErrorMessage, getErrorAction } from '@/lib/error-messages';

interface PipelineErrorDisplayProps {
  error: AppError;
  retryCount: number;
  maxRetries: number;
  onRetry?: () => void;
  onReset?: () => void;
}

export function PipelineErrorDisplay({
  error,
  retryCount,
  maxRetries,
  onRetry,
  onReset,
}: PipelineErrorDisplayProps) {
  const message = getErrorMessage(error);
  const errorAction = getErrorAction(error);

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-red-800 font-medium">{message}</p>
          <p className="text-red-600 text-sm mt-1">
            エラーコード: {error.category}/{error.code}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        {error.retryable && onRetry && retryCount < maxRetries && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            再試行 ({retryCount + 1}/{maxRetries}回目)
          </button>
        )}

        {errorAction?.action === 'navigate' && errorAction.href && (
          <Link
            href={errorAction.href}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {errorAction.label}
          </Link>
        )}

        {(errorAction?.action === 'reset' || (!error.retryable && !errorAction)) && onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {errorAction?.label ?? '最初からやり直す'}
          </button>
        )}
      </div>
    </div>
  );
}
