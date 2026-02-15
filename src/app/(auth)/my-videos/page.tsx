"use client";

import { useState } from "react";
import Link from "next/link";
import { useWalletContext } from "@/contexts/WalletContext";
import { Login } from "@/components/Login";
import { VideoCard } from "@/components/video/VideoCard";
import { DepositForm } from "@/components/irys/DepositForm";
import { useCreatorVideos } from "@/hooks/useCreatorVideos";

export default function MyVideosPage() {
  const { isConnected } = useWalletContext();
  const { videos, isLoading, error, fetchMyVideos } = useCreatorVideos();
  const [showDeposit, setShowDeposit] = useState(false);

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
                  アップロード
                </Link>
                <Link
                  href="/my-videos"
                  className="text-blue-600 font-medium hover:text-blue-800 transition-colors"
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
        {!isConnected ? (
          <div className="max-w-md mx-auto text-center py-20">
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h2 className="text-xl font-medium text-gray-700 mb-2">
              ウォレットを接続してください
            </h2>
            <p className="text-gray-500 mb-6">
              マイ動画を確認するにはウォレット接続が必要です。
            </p>
            <Login />
          </div>
        ) : (
          <>
            {/* Page header with deposit toggle */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">マイ動画</h1>
              <button
                type="button"
                onClick={() => setShowDeposit(!showDeposit)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {showDeposit ? "デポジットを閉じる" : "デポジット"}
              </button>
            </div>

            {/* Deposit form (collapsible) */}
            {showDeposit && (
              <div className="mb-6">
                <DepositForm />
              </div>
            )}

            {/* Video list */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video bg-gray-200 rounded-xl mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  type="button"
                  onClick={fetchMyVideos}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  再試行
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
                  まだ動画がありません
                </h3>
                <p className="text-gray-500 mb-4">
                  最初の動画をアップロードしましょう！
                </p>
                <Link
                  href="/upload"
                  className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  動画をアップロード
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
