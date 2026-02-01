"use client";

import { useState, useCallback } from "react";
import { videoService } from "@/lib/video";
import { useWalletContext } from "@/contexts/WalletContext";
import type {
  VideoMetadata,
  VideoListItem,
  UploadVideoParams,
  UploadProgress,
  VideoQueryParams,
} from "@/types/video";

interface UseVideoReturn {
  // Upload state
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  uploadError: string | null;

  // Query state
  isLoading: boolean;
  videos: VideoListItem[];
  queryError: string | null;

  // Actions
  uploadVideo: (params: UploadVideoParams) => Promise<string | null>;
  fetchVideos: (params?: VideoQueryParams) => Promise<void>;
  fetchVideoById: (videoId: string) => Promise<VideoMetadata | null>;
  getDecryptionAccess: (videoId: string) => Promise<{
    canAccess: boolean;
    authSig?: unknown;
    error?: string;
  }>;
}

export function useVideo(): UseVideoReturn {
  const { address, walletClient } = useWalletContext();

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Query state
  const [isLoading, setIsLoading] = useState(false);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);

  const uploadVideo = useCallback(
    async (params: UploadVideoParams): Promise<string | null> => {
      if (!address || !walletClient) {
        setUploadError("Wallet not connected");
        return null;
      }

      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(null);

      try {
        const videoId = await videoService.uploadVideo(
          params,
          walletClient,
          address,
          setUploadProgress
        );

        return videoId;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setUploadError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [address, walletClient]
  );

  const fetchVideos = useCallback(
    async (params?: VideoQueryParams): Promise<void> => {
      setIsLoading(true);
      setQueryError(null);

      try {
        const result = await videoService.queryVideos(params || {});
        setVideos(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch videos";
        setQueryError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchVideoById = useCallback(
    async (videoId: string): Promise<VideoMetadata | null> => {
      try {
        return await videoService.getVideoMetadata(videoId);
      } catch {
        return null;
      }
    },
    []
  );

  const getDecryptionAccess = useCallback(
    async (videoId: string) => {
      if (!address || !walletClient) {
        return { canAccess: false, error: "Wallet not connected" };
      }

      return videoService.getDecryptionAccess(videoId, walletClient, address);
    },
    [address, walletClient]
  );

  return {
    isUploading,
    uploadProgress,
    uploadError,
    isLoading,
    videos,
    queryError,
    uploadVideo,
    fetchVideos,
    fetchVideoById,
    getDecryptionAccess,
  };
}
