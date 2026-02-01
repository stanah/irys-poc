"use client";

import { useState, useRef, useCallback } from "react";
import { useVideo } from "@/hooks/useVideo";
import { TranscodeProgress } from "./TranscodeProgress";
import type {
  UploadVideoParams,
  VideoCategory,
  AccessType,
  RevenueSplit,
} from "@/types/video";

const VIDEO_CATEGORIES: { value: VideoCategory; label: string }[] = [
  { value: "gaming", label: "Gaming" },
  { value: "music", label: "Music" },
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
  { value: "sports", label: "Sports" },
  { value: "news", label: "News" },
  { value: "technology", label: "Technology" },
  { value: "other", label: "Other" },
];

const ACCESS_TYPES: { value: AccessType; label: string; description: string }[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can view this video",
  },
  {
    value: "token-gated",
    label: "NFT Holders Only",
    description: "Only holders of a specific NFT can view",
  },
  {
    value: "subscription",
    label: "Subscribers Only",
    description: "Only channel subscribers can view",
  },
];

interface VideoUploaderProps {
  onUploadComplete?: (videoId: string) => void;
}

export function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const { uploadVideo, isUploading, uploadProgress, uploadError } = useVideo();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<VideoCategory>("other");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [accessType, setAccessType] = useState<AccessType>("public");
  const [creatorPercent, setCreatorPercent] = useState(85);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        // Validate file type
        if (!selectedFile.type.startsWith("video/")) {
          alert("Please select a video file");
          return;
        }

        // Validate file size (max 500MB for demo)
        const maxSize = 500 * 1024 * 1024;
        if (selectedFile.size > maxSize) {
          alert("File size must be less than 500MB");
          return;
        }

        setFile(selectedFile);

        // Auto-fill title from filename
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
      alert("Please select a video file");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    const platformPercent = 10;
    const revenueSplit: RevenueSplit = {
      creator: creatorPercent,
      platform: platformPercent,
      copyrightHolders: [],
    };

    // Validate percentages sum to 100
    if (revenueSplit.creator + revenueSplit.platform !== 100) {
      alert("Revenue split must sum to 100%");
      return;
    }

    const params: UploadVideoParams = {
      file,
      title: title.trim(),
      description: description.trim(),
      category,
      tags,
      accessType,
      revenueSplit,
    };

    const videoId = await uploadVideo(params);
    if (videoId) {
      onUploadComplete?.(videoId);
    }
  };

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

  // Show progress when uploading
  if (isUploading && uploadProgress) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-6 text-center">
          Uploading Video
        </h2>
        <TranscodeProgress progress={uploadProgress} />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg space-y-6"
    >
      <h2 className="text-xl font-semibold">Upload Video</h2>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {uploadError}
        </div>
      )}

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
              Remove
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
            <p className="font-medium">Drop video here or click to browse</p>
            <p className="text-sm text-gray-500">
              Max file size: 500MB | Supported: MP4, WebM, MOV
            </p>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter video title"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Describe your video..."
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium mb-1">Category</label>
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
        <label className="block text-sm font-medium mb-1">Tags</label>
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
            placeholder="Add a tag and press Enter"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Add
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

      {/* Access Type */}
      <div>
        <label className="block text-sm font-medium mb-2">Access Control</label>
        <div className="space-y-2">
          {ACCESS_TYPES.map((type) => (
            <label
              key={type.value}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                accessType === type.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="accessType"
                value={type.value}
                checked={accessType === type.value}
                onChange={(e) => setAccessType(e.target.value as AccessType)}
                className="mt-1"
              />
              <div>
                <p className="font-medium">{type.label}</p>
                <p className="text-sm text-gray-500">{type.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Revenue Split */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Revenue Split (Creator: {creatorPercent}%, Platform: 10%)
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
        disabled={!file || isUploading}
        className={`w-full py-3 rounded-lg font-medium transition-colors ${
          !file || isUploading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        {isUploading ? "Uploading..." : "Upload Video"}
      </button>
    </form>
  );
}
