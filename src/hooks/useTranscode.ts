"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { livepeerService } from "@/lib/livepeer";
import type { LivepeerAsset } from "@/types/video";

interface UseTranscodeReturn {
  status: LivepeerAsset["status"] | null;
  isPolling: boolean;
  error: string | null;
  startPolling: (assetId: string) => void;
  stopPolling: () => void;
}

export function useTranscode(): UseTranscodeReturn {
  const [status, setStatus] = useState<LivepeerAsset["status"] | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const assetIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
    assetIdRef.current = null;
  }, []);

  const checkStatus = useCallback(async (assetId: string) => {
    try {
      const asset = await livepeerService.getAsset(assetId);
      setStatus(asset.status);
      setError(null);

      // Stop polling if ready or failed
      if (asset.status.phase === "ready" || asset.status.phase === "failed") {
        stopPolling();

        if (asset.status.phase === "failed") {
          setError(asset.status.errorMessage || "Transcode failed");
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check status";
      setError(message);
    }
  }, [stopPolling]);

  const startPolling = useCallback(
    (assetId: string) => {
      // Stop any existing polling
      stopPolling();

      assetIdRef.current = assetId;
      setIsPolling(true);
      setError(null);
      setStatus({ phase: "waiting" });

      // Initial check
      checkStatus(assetId);

      // Start polling every 5 seconds
      pollingRef.current = setInterval(() => {
        if (assetIdRef.current) {
          checkStatus(assetIdRef.current);
        }
      }, 5000);
    },
    [checkStatus, stopPolling]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return {
    status,
    isPolling,
    error,
    startPolling,
    stopPolling,
  };
}
