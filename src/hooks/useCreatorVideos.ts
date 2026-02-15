"use client";

import { useState, useCallback, useEffect } from "react";
import { useServiceContext } from "@/contexts/ServiceContext";
import { useWalletContext } from "@/contexts/WalletContext";
import type { VideoListItem } from "@/types/video";

interface UseCreatorVideosReturn {
  videos: VideoListItem[];
  isLoading: boolean;
  error: string | null;
  fetchMyVideos: () => Promise<void>;
}

export function useCreatorVideos(): UseCreatorVideosReturn {
  const { irys } = useServiceContext();
  const { address } = useWalletContext();
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyVideos = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    const result = await irys.queryFiles(address);

    if (result.success) {
      setVideos(result.data as VideoListItem[]);
    } else {
      setError(result.error.message);
    }

    setIsLoading(false);
  }, [irys, address]);

  // Task 4.6: マウント時自動フェッチ + address変更時リフェッチ
  useEffect(() => {
    if (address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchMyVideos();
    }
  }, [address, fetchMyVideos]);

  return {
    videos,
    isLoading,
    error,
    fetchMyVideos,
  };
}
