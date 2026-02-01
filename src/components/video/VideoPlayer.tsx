"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { videoService } from "@/lib/video";
import { decryptSegment } from "@/lib/encryption";
import { useWalletContext } from "@/contexts/WalletContext";
import type { VideoMetadata, EncryptedSegment } from "@/types/video";

interface VideoPlayerProps {
  video: VideoMetadata;
  autoPlay?: boolean;
  onError?: (error: string) => void;
}

export function VideoPlayer({ video, autoPlay = false, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const { address, walletClient } = useWalletContext();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>("auto");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize player
  const initializePlayer = useCallback(async () => {
    if (!videoRef.current || !video.renditions.length) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if wallet connected for non-public videos
      if (video.accessType !== "public" && (!address || !walletClient)) {
        throw new Error("Please connect your wallet to access this video");
      }

      // Get decryption access
      let authSig: unknown = null;
      if (video.accessType !== "public" && address && walletClient) {
        const access = await videoService.getDecryptionAccess(
          video.id,
          walletClient,
          address
        );

        if (!access.canAccess) {
          throw new Error(access.error || "Access denied");
        }
        authSig = access.authSig;
      }

      // Load encrypted segments
      const selectedRendition = video.renditions[0]; // Use first rendition for now
      const encryptedSegments = await videoService.loadEncryptedSegments(selectedRendition);

      // Create custom loader for decryption
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        // Create a custom loader that decrypts segments
        const CustomLoader = createCustomLoader(
          encryptedSegments,
          video.accessControlConditions,
          authSig
        );

        const hls = new Hls({
          loader: CustomLoader,
          enableWorker: true,
          lowLatencyMode: false,
        });

        // For public videos without encryption, use direct playback URL if available
        if (video.accessType === "public" && video.hlsManifestCid) {
          hls.loadSource(`https://gateway.irys.xyz/${video.hlsManifestCid}`);
        } else {
          // For encrypted videos, generate a valid HLS playlist
          const playlist = generateEncryptedPlaylist(
            selectedRendition,
            encryptedSegments
          );
          const playlistBlob = new Blob([playlist], {
            type: "application/vnd.apple.mpegurl",
          });
          const playlistUrl = URL.createObjectURL(playlistBlob);
          hls.loadSource(playlistUrl);
        }

        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (autoPlay) {
            videoRef.current?.play().catch(() => {
              // Auto-play was prevented
            });
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            const message = data.details || "Playback error";
            setError(message);
            onError?.(message);
          }
        });

        hlsRef.current = hls;
      } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS support (Safari)
        if (video.hlsManifestCid) {
          videoRef.current.src = `https://gateway.irys.xyz/${video.hlsManifestCid}`;
          setIsLoading(false);
        }
      } else {
        throw new Error("HLS playback is not supported in this browser");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load video";
      setError(message);
      onError?.(message);
      setIsLoading(false);
    }
  }, [video, address, walletClient, autoPlay, onError]);

  useEffect(() => {
    initializePlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [initializePlayer]);

  // Video event handlers
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleTimeUpdate = () => setCurrentTime(videoEl.currentTime);
    const handleDurationChange = () => setDuration(videoEl.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => setVolume(videoEl.volume);

    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("durationchange", handleDurationChange);
    videoEl.addEventListener("play", handlePlay);
    videoEl.addEventListener("pause", handlePause);
    videoEl.addEventListener("volumechange", handleVolumeChange);

    return () => {
      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("durationchange", handleDurationChange);
      videoEl.removeEventListener("play", handlePlay);
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("volumechange", handleVolumeChange);
    };
  }, []);

  // Controls visibility
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const toggleFullscreen = useCallback(() => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!isFullscreen) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolume(vol);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="relative aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        onClick={togglePlay}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center text-white p-4">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-lg font-medium mb-2">Unable to play video</p>
            <p className="text-sm text-gray-300">{error}</p>
            <button
              onClick={initializePlayer}
              className="mt-4 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Play button overlay */}
      {!isLoading && !error && !isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform">
            <svg
              className="w-8 h-8 ml-1 text-black"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress bar */}
        <div className="mb-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !videoRef.current.muted;
                  }
                }}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {volume === 0 ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer"
              />
            </div>

            {/* Time */}
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quality */}
            <select
              value={currentQuality}
              onChange={(e) => setCurrentQuality(e.target.value)}
              className="bg-transparent text-white text-sm border border-gray-500 rounded px-2 py-1"
            >
              <option value="auto">Auto</option>
              {video.renditions.map((r) => (
                <option key={r.quality} value={r.quality}>
                  {r.quality}
                </option>
              ))}
            </select>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate a valid HLS playlist for encrypted video segments
 */
function generateEncryptedPlaylist(
  rendition: VideoMetadata["renditions"][0],
  segments: Map<string, EncryptedSegment>
): string {
  const segmentCount = segments.size;
  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-TARGETDURATION:10",
    "#EXT-X-MEDIA-SEQUENCE:0",
    "#EXT-X-PLAYLIST-TYPE:VOD",
  ];

  // Add segment entries
  for (let i = 0; i < segmentCount; i++) {
    lines.push(`#EXTINF:10.0,`);
    lines.push(`segment_${i}.enc`);
  }

  lines.push("#EXT-X-ENDLIST");
  return lines.join("\n");
}

// Create a custom HLS.js loader that decrypts segments
function createCustomLoader(
  encryptedSegments: Map<string, EncryptedSegment>,
  accessControlConditions: VideoMetadata["accessControlConditions"],
  authSig: unknown
) {
  return class CustomLoader extends Hls.DefaultConfig.loader {
    async load(
      context: any,
      config: any,
      callbacks: any
    ) {
      const url = context.url;
      // Extract segment key, removing any query strings or blob URL prefixes
      let segmentKey = url.split("/").pop() || "";
      segmentKey = segmentKey.split("?")[0]; // Remove query string if any

      // Check if this is an encrypted segment
      const encrypted = encryptedSegments.get(segmentKey);

      if (encrypted && authSig) {
        try {
          const decrypted = await decryptSegment(
            encrypted,
            accessControlConditions,
            authSig
          );

          const stats = {
            aborted: false,
            loaded: decrypted.byteLength,
            total: decrypted.byteLength,
          };

          callbacks.onSuccess(
            {
              url: context.url,
              data: decrypted,
            },
            stats,
            context,
            null
          );
        } catch (error) {
          callbacks.onError(
            { code: 2, text: "Decryption failed" },
            context,
            null
          );
        }
      } else {
        // Use default loader for non-encrypted content
        super.load(context, config, callbacks);
      }
    }
  };
}
