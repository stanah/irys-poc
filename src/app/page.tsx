"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWalletContext } from "@/contexts/WalletContext";
import { Login } from "@/components/Login";
import { VideoCard } from "@/components/video/VideoCard";
import { useVideoList } from "@/hooks/useVideoList";
import type { VideoCategory } from "@/types/video";

const CATEGORIES: { value: VideoCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "gaming", label: "Gaming" },
  { value: "music", label: "Music" },
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
  { value: "sports", label: "Sports" },
  { value: "technology", label: "Technology" },
];

export default function Home() {
  const { isConnected } = useWalletContext();
  const { videos, isLoading, error, fetchVideos } = useVideoList();

  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | "all">("all");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetchVideos(
      selectedCategory === "all" ? {} : { category: selectedCategory }
    );
  }, [fetchVideos, selectedCategory]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm7 2l5 4-5 4V8z" />
            </svg>
            <span className="text-xl font-bold">DecentralizedVideo</span>
          </Link>

          <div className="flex items-center gap-4">
            {isConnected && (
              <>
                <Link
                  href="/upload"
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Upload
                </Link>
                <Link
                  href="/my-videos"
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  マイ動画
                </Link>
              </>
            )}
            <Login />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Decentralized Video Streaming
          </h1>
          <p className="text-lg opacity-90 mb-4 max-w-2xl">
            Upload, share, and earn from your videos on the decentralized web.
            No middleman, transparent revenue sharing, permanent storage.
          </p>
          <div className="flex gap-4">
            {isConnected ? (
              <Link
                href="/upload"
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Start Creating
              </Link>
            ) : (
              <div className="text-white/80">
                Connect your wallet to start uploading videos
              </div>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Video Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => fetchVideos()}
              className="text-blue-500 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-20 h-20 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              No videos yet
            </h3>
            <p className="text-gray-500 mb-4">
              Be the first to upload a video to the decentralized web!
            </p>
            {isConnected && (
              <Link
                href="/upload"
                className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Upload Video
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>
            Powered by{" "}
            <a
              href="https://livepeer.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Livepeer
            </a>
            ,{" "}
            <a
              href="https://litprotocol.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Lit Protocol
            </a>
            , and{" "}
            <a
              href="https://irys.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Irys
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
