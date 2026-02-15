"use client";

import { useState, useRef, useCallback } from "react";
import { usePipelineOrchestrator, MAX_RETRY_COUNT } from "@/hooks/usePipelineOrchestrator";
import { useWalletContext } from "@/contexts/WalletContext";
import { TranscodeProgress } from "./TranscodeProgress";
import { PipelineErrorDisplay } from "./PipelineErrorDisplay";
import type { VideoCategory } from "@/types/video";

const VIDEO_CATEGORIES: { value: VideoCategory; label: string }[] = [
  { value: "gaming", label: "ゲーム" },
  { value: "music", label: "音楽" },
  { value: "education", label: "教育" },
  { value: "entertainment", label: "エンターテインメント" },
  { value: "sports", label: "スポーツ" },
  { value: "news", label: "ニュース" },
  { value: "technology", label: "テクノロジー" },
  { value: "other", label: "その他" },
];

interface VideoUploaderProps {
  onUploadComplete?: (videoId: string) => void;
}

export function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const { state: pipelineState, startUpload, cancelUpload, retryUpload } = usePipelineOrchestrator();
  const { address } = useWalletContext();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<VideoCategory>("other");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [creatorPercent, setCreatorPercent] = useState(85);
  const [metadataCid, setMetadataCid] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = pipelineState.stage !== 'idle' && pipelineState.stage !== 'failed' && pipelineState.stage !== 'completed';

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        if (!selectedFile.type.startsWith("video/")) {
          alert("動画ファイルを選択してください");
          return;
        }

        const maxSize = 500 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
          alert("ファイルサイズは500MB以下にしてください");
          return;
        }

        setFile(selectedFile);

        if (!title) {
          const name = selectedFile.name.replace(/\.[^/.]+$/, "");
          setTitle(name);
        }
      }
    },
    [title]
  );

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert("動画ファイルを選択してください");
      return;
    }

    if (!title.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    if (!address) {
      alert("ウォレットを接続してください");
      return;
    }

    setMetadataCid(null);
    const cid = await startUpload(file, {
      title: title.trim(),
      description: description.trim(),
      category,
      tags,
      accessType: 'public',
      creatorAddress: address,
    });

    if (cid) {
      setMetadataCid(cid);
      onUploadComplete?.(cid);
    }
  };

  const handleReset = useCallback(() => {
    setFile(null);
    setTitle("");
    setDescription("");
    setCategory("other");
    setTags([]);
    setTagInput("");
    setCreatorPercent(85);
    setMetadataCid(null);
    cancelUpload();
  }, [cancelUpload]);

  const handleRetry = useCallback(async () => {
    const cid = await retryUpload();
    if (cid) {
      setMetadataCid(cid);
      onUploadComplete?.(cid);
    }
  }, [retryUpload, onUploadComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile?.type.startsWith("video/")) {
        setFile(droppedFile);
        if (!title) {
          const name = droppedFile.name.replace(/\.[^/.]+$/, "");
          setTitle(name);
        }
      }
    },
    [title]
  );

  // エラー状態: PipelineErrorDisplayを表示
  if (pipelineState.stage === 'failed' && pipelineState.error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg space-y-6">
        <h2 className="text-xl font-semibold text-center">
          動画アップロード
        </h2>
        <TranscodeProgress
          pipelineState={pipelineState}
          onCancel={cancelUpload}
          onReset={handleReset}
          metadataCid={metadataCid}
        />
        <PipelineErrorDisplay
          error={pipelineState.error}
          retryCount={pipelineState.retryCount}
          maxRetries={MAX_RETRY_COUNT}
          onRetry={handleRetry}
          onReset={handleReset}
        />
      </div>
    );
  }

  if (isProcessing || pipelineState.stage === 'completed') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-6 text-center">
          動画アップロード
        </h2>
        <TranscodeProgress
          pipelineState={pipelineState}
          onCancel={cancelUpload}
          onReset={handleReset}
          metadataCid={metadataCid}
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg space-y-6"
    >
      <h2 className="text-xl font-semibold">動画アップロード</h2>

      {/* File Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          file
            ? "border-green-500 bg-green-50"
            : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {file ? (
          <div>
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-gray-500">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="mt-2 text-red-500 text-sm hover:underline"
            >
              削除
            </button>
          </div>
        ) : (
          <div>
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="font-medium">動画をドロップまたはクリックして選択</p>
            <p className="text-sm text-gray-500">
              最大ファイルサイズ: 500MB | 対応形式: MP4, WebM, MOV
            </p>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1">タイトル *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="動画タイトルを入力"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">説明</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="動画の説明を入力..."
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium mb-1">カテゴリ</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as VideoCategory)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {VIDEO_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium mb-1">タグ</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="タグを入力してEnterキーで追加"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            追加
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-500"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Access Type - Story 2.1では公開のみ */}
      <div>
        <label className="block text-sm font-medium mb-2">アクセス設定</label>
        <div className="space-y-2">
          <label
            className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer border-blue-500 bg-blue-50"
          >
            <input
              type="radio"
              name="accessType"
              value="public"
              checked
              readOnly
              className="mt-1"
            />
            <div>
              <p className="font-medium">公開</p>
              <p className="text-sm text-gray-500">すべての人がこの動画を視聴できます</p>
            </div>
          </label>
        </div>
      </div>

      {/* Revenue Split */}
      <div>
        <label className="block text-sm font-medium mb-2">
          収益配分 (クリエイター: {creatorPercent}%, プラットフォーム: 10%)
        </label>
        <input
          type="range"
          min={70}
          max={90}
          value={creatorPercent}
          onChange={(e) => setCreatorPercent(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>70%</span>
          <span>90%</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!file || isProcessing}
        className={`w-full py-3 rounded-lg font-medium transition-colors ${
          !file || isProcessing
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        アップロード開始
      </button>
    </form>
  );
}
