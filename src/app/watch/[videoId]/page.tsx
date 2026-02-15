"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useWalletContext } from "@/contexts/WalletContext";
import { Login } from "@/components/Login";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { TippingWidget } from "@/components/monetization/TippingWidget";
import { useVideoMetadata } from "@/hooks/useVideoMetadata";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WatchPage() {
  const params = useParams();
  const videoId = params.videoId as string;

  const { isConnected } = useWalletContext();
  const { video, isLoading, error } = useVideoMetadata(videoId);

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

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : error ? (
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-xl font-medium text-gray-700 mb-2">
              {error}
            </h2>
            <Link
              href="/"
              className="text-blue-500 hover:underline"
            >
              ホームに戻る
            </Link>
          </div>
        ) : video ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video player and info */}
            <div className="lg:col-span-2 space-y-4">
              <VideoPlayer video={video} />

              {/* Video info */}
              <div className="bg-white rounded-xl p-4 space-y-4">
                <h1 className="text-xl font-semibold">{video.title}</h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <Link
                    href={`/channel/${video.creatorAddress}`}
                    className="flex items-center gap-2 hover:text-blue-500"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
                    <span>{truncateAddress(video.creatorAddress)}</span>
                  </Link>

                  <span>•</span>
                  <span>{formatDate(video.createdAt)}</span>

                  <span>•</span>
                  <span className="capitalize">{video.category}</span>

                  {video.accessType !== "public" && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {video.accessType === "token-gated" ? (
                          <>
                            <svg
                              className="w-4 h-4 text-amber-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                            </svg>
                            NFT Gated
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4 text-indigo-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            限定公開
                          </>
                        )}
                      </span>
                    </>
                  )}
                </div>

                {/* Tags */}
                {video.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {video.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                {video.description && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">説明</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {video.description}
                    </p>
                  </div>
                )}

                {/* Revenue split info */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">収益分配</h3>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span>クリエイター: {video.revenueSplit.creator}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span>プラットフォーム: {video.revenueSplit.platform}%</span>
                    </div>
                    {video.revenueSplit.copyrightHolders.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full" />
                        <span>
                          著作権:{" "}
                          {video.revenueSplit.copyrightHolders.reduce(
                            (sum, h) => sum + h.percentage,
                            0
                          )}
                          %
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Tipping widget — ウォレット接続時のみ表示 */}
              {isConnected && (
                <TippingWidget
                  videoId={video.id}
                  creatorAddress={video.creatorAddress}
                />
              )}

              {/* Storage info */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-medium mb-3">ストレージ情報</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ストレージ</span>
                    <span className="font-mono">Irys (永続保存)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">暗号化</span>
                    <span className="font-mono">Lit Protocol</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">トランスコード</span>
                    <span className="font-mono">Livepeer HLS</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">トランザクションID</span>
                    <a
                      href={`https://gateway.irys.xyz/${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-500 hover:underline text-right break-all max-w-[150px]"
                    >
                      {truncateAddress(video.id)}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
