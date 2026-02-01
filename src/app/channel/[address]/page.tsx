"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWalletContext } from "@/contexts/WalletContext";
import { Login } from "@/components/Login";
import { VideoCard } from "@/components/video/VideoCard";
import { useVideo } from "@/hooks/useVideo";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ChannelPage() {
  const params = useParams();
  const channelAddress = params.address as string;

  const { address: currentUserAddress } = useWalletContext();
  const { videos, isLoading, queryError, fetchVideos } = useVideo();

  const [mounted, setMounted] = useState(false);

  const isOwnChannel =
    currentUserAddress?.toLowerCase() === channelAddress?.toLowerCase();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (channelAddress) {
      fetchVideos({ creatorAddress: channelAddress });
    }
  }, [fetchVideos, channelAddress]);

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

          <Login />
        </div>
      </header>

      {/* Channel banner */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 h-48" />

      {/* Channel info */}
      <div className="max-w-7xl mx-auto px-4 -mt-16">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4 mb-8">
          {/* Avatar */}
          <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
            <span className="text-4xl text-white font-bold">
              {channelAddress?.slice(2, 4).toUpperCase()}
            </span>
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  {truncateAddress(channelAddress || "")}
                </h1>
                <p className="text-gray-500">{videos.length} videos</p>
              </div>

              {isOwnChannel && (
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
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
                  Upload Video
                </Link>
              )}
            </div>
          </div>

          {/* Copy address button */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(channelAddress);
            }}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 bg-white px-4 py-2 rounded-lg border shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
            Copy Address
          </button>
        </div>

        {/* Videos */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Videos</h2>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : queryError ? (
            <div className="text-center py-20">
              <p className="text-red-500 mb-4">{queryError}</p>
              <button
                onClick={() => fetchVideos({ creatorAddress: channelAddress })}
                className="text-blue-500 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl">
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
              <p className="text-gray-500">
                {isOwnChannel
                  ? "Start uploading videos to build your channel!"
                  : "This creator hasn't uploaded any videos yet."}
              </p>
              {isOwnChannel && (
                <Link
                  href="/upload"
                  className="inline-block mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Upload Your First Video
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
        </div>
      </div>
    </div>
  );
}
