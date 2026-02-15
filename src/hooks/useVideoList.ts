"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useServiceContext } from "@/contexts/ServiceContext";
import type { VideoListItem, VideoQueryParams } from "@/types/video";

interface UseVideoListReturn {
  videos: VideoListItem[];
  isLoading: boolean;
  error: string | null;
  fetchVideos: (params?: VideoQueryParams) => Promise<void>;
  hasNextPage: boolean;
  loadMore: () => Promise<void>;
}

export function useVideoList(
  initialParams?: VideoQueryParams,
): UseVideoListReturn {
  const { irys } = useServiceContext();
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const initialFetchDone = useRef(false);

  const fetchVideos = useCallback(
    async (params?: VideoQueryParams) => {
      setIsLoading(true);
      setError(null);

      const startTime = Date.now();
      const result = await irys.queryFiles(params?.creatorAddress || "", {});

      if (!result.success) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }

      const items = result.data as VideoListItem[];

      // Client-side filtering (category, accessType)
      let filtered = items;
      if (params?.category) {
        filtered = filtered.filter((v) => v.category === params.category);
      }
      if (params?.accessType) {
        filtered = filtered.filter((v) => v.accessType === params.accessType);
      }

      const durationMs = Date.now() - startTime;
      console.log(
        `[METRIC] event=video_list_fetch, filter_category=${params?.category || "all"}, filter_creator=${params?.creatorAddress || "all"}, result_count=${filtered.length}, duration_ms=${durationMs}, timestamp=${new Date().toISOString()}`,
      );

      setVideos(filtered);
      setHasNextPage(false); // Pagination enhancement in P1
      setIsLoading(false);
    },
    [irys],
  );

  // Auto-fetch on mount only when initialParams is explicitly provided
  useEffect(() => {
    if (initialParams && !initialFetchDone.current) {
      initialFetchDone.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchVideos(initialParams);
    }
  }, [fetchVideos, initialParams]);

  const loadMore = useCallback(async () => {
    // Pagination implementation (P1 enhancement)
  }, []);

  return { videos, isLoading, error, fetchVideos, hasNextPage, loadMore };
}
