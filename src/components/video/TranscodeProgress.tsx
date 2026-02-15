"use client";

import Link from "next/link";
import type { PipelineState, PipelineStage } from "@/types/pipeline";

interface TranscodeProgressProps {
  pipelineState: PipelineState;
  onCancel?: () => void;
  onReset?: () => void;
  metadataCid?: string | null;
}

const stageLabels: Partial<Record<PipelineStage, string>> = {
  preparing: "準備中",
  uploading: "アップロード",
  transcoding: "トランスコード",
  storing: "保存",
  completed: "完了",
  failed: "失敗",
  cancelling: "キャンセル中",
};

const stageDescriptions: Partial<Record<PipelineStage, string>> = {
  preparing: "アップロードを準備しています...",
  uploading: "動画をトランスコードサービスにアップロード中...",
  transcoding: "動画をHLS形式に変換中...",
  storing: "動画データをIrysに保存中...",
  completed: "動画のアップロードが完了しました！",
  failed: "アップロードに失敗しました",
  cancelling: "キャンセルしています...",
};

// 公開動画パイプライン: encryptingは含めない
const displayStages: PipelineStage[] = [
  "preparing",
  "uploading",
  "transcoding",
  "storing",
];

export function TranscodeProgress({ pipelineState, onCancel, onReset, metadataCid }: TranscodeProgressProps) {
  const { stage, progress, message } = pipelineState;
  const currentStageIndex = displayStages.indexOf(stage as PipelineStage);
  const isError = stage === "failed";
  const isCancelling = stage === "cancelling";
  const isIdle = stage === "idle";
  const isCompleted = stage === "completed";

  if (isIdle) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isError
                ? "bg-red-500"
                : isCancelling
                ? "bg-yellow-500"
                : isCompleted
                ? "bg-green-500"
                : "bg-blue-500"
            }`}
            style={{
              width: isError || isCancelling
                ? "100%"
                : isCompleted
                ? "100%"
                : currentStageIndex >= 0
                ? `${
                    (currentStageIndex / displayStages.length) * 100 +
                    (progress / displayStages.length)
                  }%`
                : "0%",
            }}
          />
        </div>
      </div>

      {/* Stage indicators */}
      <div className="flex justify-between">
        {displayStages.map((s, index) => {
          const stageCompleted = currentStageIndex > index ||
            (pipelineState.lastCompletedStage === s);
          const isCurrent = currentStageIndex === index;
          const isPending = currentStageIndex < index;

          return (
            <div
              key={s}
              className={`flex flex-col items-center ${
                isError && isCurrent ? "text-red-500" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  stageCompleted || isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? isError
                      ? "bg-red-500 text-white"
                      : "bg-blue-500 text-white animate-pulse"
                    : isPending
                    ? "bg-gray-200 text-gray-400"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {stageCompleted || isCompleted ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isError && isCurrent ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-1 text-xs ${
                  isCurrent ? "font-medium" : "text-gray-500"
                }`}
              >
                {stageLabels[s] ?? s}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="text-center">
        <p
          className={`text-sm ${
            isError
              ? "text-red-600"
              : isCancelling
              ? "text-yellow-600"
              : isCompleted
              ? "text-green-600"
              : "text-gray-600"
          }`}
        >
          {isError
            ? stageDescriptions.failed
            : (message || stageDescriptions[stage] || "")}
        </p>
        {!isError &&
          !isCancelling &&
          !isCompleted &&
          progress > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {progress}% 完了
            </p>
          )}
      </div>

      {/* Cancel button */}
      {onCancel &&
        !isError &&
        !isCancelling &&
        !isCompleted && (
          <div className="text-center">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            >
              キャンセル
            </button>
          </div>
        )}

      {/* Completed message */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <svg
            className="w-12 h-12 mx-auto text-green-500 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-green-700 font-medium">
            動画が正常にアップロードされました！
          </p>
          <p className="text-green-600 text-sm mt-1">
            分散型ウェブに永続保存されました。
          </p>
          <div className="mt-3 flex gap-2 justify-center">
            {metadataCid && (
              <button
                type="button"
                disabled
                className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg opacity-50 cursor-not-allowed"
                title="Story 2.4で実装予定"
              >
                動画を見る
              </button>
            )}
            <Link
              href="/my-videos"
              className="px-4 py-2 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-colors"
            >
              マイ動画一覧
            </Link>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="px-4 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
              >
                別の動画をアップロード
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
