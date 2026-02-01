"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWalletContext } from "@/contexts/WalletContext";
import { Login } from "@/components/Login";
import { VideoUploader } from "@/components/video/VideoUploader";

export default function UploadPage() {
  const router = useRouter();
  const { isConnected } = useWalletContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleUploadComplete = (videoId: string) => {
    router.push(`/watch/${videoId}`);
  };

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

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
        </div>

        {isConnected ? (
          <VideoUploader onUploadComplete={handleUploadComplete} />
        ) : (
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
              Connect Your Wallet
            </h2>
            <p className="text-gray-500 mb-6">
              Please connect your MetaMask wallet to upload videos.
            </p>
            <Login />
          </div>
        )}
      </main>
    </div>
  );
}
