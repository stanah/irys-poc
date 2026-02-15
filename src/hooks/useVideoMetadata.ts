"use client";

import { useState, useEffect, useRef } from "react";
import { useServiceContext } from "@/contexts/ServiceContext";
import type { VideoMetadata } from "@/types/video";

interface UseVideoMetadataReturn {
  video: VideoMetadata | null;
  isLoading: boolean;
  error: string | null;
}

function parseMetadata(videoId: string, raw: Record<string, unknown>): VideoMetadata {
  return {
    id: videoId,
    creatorAddress: (raw.creatorAddress as string) || "",
    createdAt: (raw.createdAt as number) || 0,
    title: (raw.title as string) || "Untitled",
    description: (raw.description as string) || "",
    thumbnailCid: (raw.thumbnailCid as string) || "",
    duration: (raw.duration as number) || 0,
    category: (raw.category as VideoMetadata["category"]) || "other",
    tags: (raw.tags as string[]) || [],
    transcodeStatus: (raw.transcodeStatus as VideoMetadata["transcodeStatus"]) || "completed",
    hlsManifestCid: (raw.hlsManifestCid as string) || "",
    renditions: (raw.renditions as VideoMetadata["renditions"]) || [],
    accessType: (raw.accessType as VideoMetadata["accessType"]) || "public",
    accessControlConditions: (raw.accessControlConditions as VideoMetadata["accessControlConditions"]) || [],
    revenueSplit: (raw.revenueSplit as VideoMetadata["revenueSplit"]) || {
      creator: 85,
      platform: 10,
      copyrightHolders: [],
    },
  };
}

export function useVideoMetadata(videoId: string | undefined): UseVideoMetadataReturn {
  const { irys } = useServiceContext();
  const hasVideoId = !!videoId;
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(hasVideoId);
  const [error, setError] = useState<string | null>(hasVideoId ? null : "動画IDが指定されていません");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!videoId) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const fetchMetadata = async () => {
      setIsLoading(true);
      setError(null);
      setVideo(null);

      const result = await irys.getMetadata(videoId, { signal: controller.signal });
      if (controller.signal.aborted) return;

      if (!result.success) {
        setError(result.error.message);
        setIsLoading(false);
        return;
      }

      setVideo(parseMetadata(videoId, result.data as Record<string, unknown>));
      setIsLoading(false);
    };

    fetchMetadata();

    return () => {
      controller.abort();
    };
  }, [videoId, irys]);

  return { video, isLoading, error };
}
