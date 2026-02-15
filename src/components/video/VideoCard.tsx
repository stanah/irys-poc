"use client";

import Link from "next/link";
import type { VideoListItem } from "@/types/video";

interface VideoCardProps {
  video: VideoListItem;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minutes ago`;
    }
    return `${diffHours} hours ago`;
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const categoryColors: Record<string, string> = {
  gaming: "bg-purple-100 text-purple-700",
  music: "bg-pink-100 text-pink-700",
  education: "bg-green-100 text-green-700",
  entertainment: "bg-yellow-100 text-yellow-700",
  sports: "bg-orange-100 text-orange-700",
  news: "bg-red-100 text-red-700",
  technology: "bg-blue-100 text-blue-700",
  other: "bg-gray-100 text-gray-700",
};


export function VideoCard({ video }: VideoCardProps) {
  const categoryClass = categoryColors[video.category] || categoryColors.other;

  return (
    <Link
      href={`/watch/${video.id}`}
      className="block group"
    >
      <div className="space-y-2">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gray-200 rounded-xl overflow-hidden">
          {video.thumbnailCid ? (
            <img
              src={`https://gateway.irys.xyz/${video.thumbnailCid}`}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
              <svg
                className="w-12 h-12 text-gray-500"
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
            </div>
          )}

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(video.duration)}
          </div>

          {/* Access type badge */}
          {video.accessType === "public" ? (
            <div className="absolute top-2 left-2 bg-green-500/90 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              公開
            </div>
          ) : (
            <div className="absolute top-2 left-2 bg-amber-500/90 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
              </svg>
              限定
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>

        {/* Info */}
        <div className="space-y-1">
          <h3 className="font-medium line-clamp-2 group-hover:text-blue-600 transition-colors">
            {video.title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span
              title={video.creatorAddress}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/channel/${video.creatorAddress}`;
              }}
              className="hover:text-blue-500 hover:underline cursor-pointer"
            >
              {truncateAddress(video.creatorAddress)}
            </span>
            <span>•</span>
            <span>{formatDate(video.createdAt)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryClass}`}>
              {video.category}
            </span>

            {video.totalTips > 0n && (
              <span className="text-xs text-gray-500">
                {(Number(video.totalTips) / 1e18).toFixed(2)} ETH tips
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
