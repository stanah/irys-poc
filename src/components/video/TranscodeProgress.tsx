"use client";

import type { UploadProgress } from "@/types/video";

interface TranscodeProgressProps {
  progress: UploadProgress;
}

const stageLabels: Record<UploadProgress["stage"], string> = {
  preparing: "Preparing",
  uploading: "Uploading",
  transcoding: "Transcoding",
  encrypting: "Encrypting",
  storing: "Storing",
  completed: "Completed",
  failed: "Failed",
};

const stageDescriptions: Record<UploadProgress["stage"], string> = {
  preparing: "Setting up upload...",
  uploading: "Uploading video to transcoding service...",
  transcoding: "Converting video to HLS format...",
  encrypting: "Encrypting video segments with Lit Protocol...",
  storing: "Storing encrypted segments on Irys...",
  completed: "Video successfully uploaded!",
  failed: "Upload failed",
};

export function TranscodeProgress({ progress }: TranscodeProgressProps) {
  const stages: UploadProgress["stage"][] = [
    "preparing",
    "uploading",
    "transcoding",
    "encrypting",
    "storing",
    "completed",
  ];

  const currentStageIndex = stages.indexOf(progress.stage);
  const isError = progress.stage === "failed";

  return (
    <div className="w-full space-y-4">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isError ? "bg-red-500" : "bg-blue-500"
            }`}
            style={{
              width: isError
                ? "100%"
                : `${
                    progress.stage === "completed"
                      ? 100
                      : (currentStageIndex / (stages.length - 1)) * 100 +
                        (progress.percentage / (stages.length - 1)) * 0.8
                  }%`,
            }}
          />
        </div>
      </div>

      {/* Stage indicators */}
      <div className="flex justify-between">
        {stages.slice(0, -1).map((stage, index) => {
          const isCompleted = currentStageIndex > index;
          const isCurrent = currentStageIndex === index;
          const isPending = currentStageIndex < index;

          return (
            <div
              key={stage}
              className={`flex flex-col items-center ${
                isError && isCurrent ? "text-red-500" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isCompleted
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
                {isCompleted ? (
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
                {stageLabels[stage]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <div className="text-center">
        <p
          className={`text-sm ${
            isError ? "text-red-600" : "text-gray-600"
          }`}
        >
          {progress.message || stageDescriptions[progress.stage]}
        </p>
        {progress.stage !== "completed" &&
          progress.stage !== "failed" &&
          progress.percentage > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {progress.percentage}% complete
            </p>
          )}
      </div>

      {/* Success message */}
      {progress.stage === "completed" && (
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
            Video uploaded successfully!
          </p>
          <p className="text-green-600 text-sm mt-1">
            Your video is now stored permanently on the decentralized web.
          </p>
        </div>
      )}
    </div>
  );
}
