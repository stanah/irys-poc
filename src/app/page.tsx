"use client";

import { useWalletContext } from "@/contexts/WalletContext";
import { Login } from "@/components/Login";
import { UploadForm } from "@/components/UploadForm";
import { FileList } from "@/components/FileList";
import { useEffect, useState } from "react";

export default function Home() {
  const { isConnected } = useWalletContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );

  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen p-8 gap-8 font-[family-name:var(--font-geist-sans)]">
      <header className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold text-center">
          Secure File Sharing PoC
        </h1>
        <p className="text-gray-500 text-center max-w-lg">
          Upload files securely using Lit Protocol encryption and Irys permanent
          storage. Only the specified recipient can decrypt/view the file.
        </p>
        <Login />
      </header>

      <main className="flex flex-col items-center w-full">
        {isConnected ? (
          <div className="flex flex-col lg:flex-row gap-8 w-full max-w-5xl justify-center items-start">
            <UploadForm />
            <FileList />
          </div>
        ) : (
          <div className="text-center text-gray-400 mt-10">
            Please connect MetaMask to start sharing files.
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400">
        Powered by MetaMask, Lit Protocol, and Irys.
      </footer>
    </div>
  );
}
