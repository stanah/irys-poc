"use client";

import { useWalletContext } from "@/contexts/WalletContext";
import { useState } from "react";

export const Login = () => {
  const { address, isConnecting, isConnected, connect, disconnect, error } =
    useWalletContext();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="text-sm">
          <p className="font-semibold text-gray-700">Connected</p>
          <div className="flex items-center gap-2">
            <p
              className="font-mono text-xs text-gray-500 truncate max-w-[150px]"
              title={address}
            >
              {address}
            </p>
            <button
              onClick={copyAddress}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              title="Copy address"
            >
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
          </div>
        </div>
        <button
          onClick={disconnect}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#f97316", color: "white" }}
      >
        {isConnecting ? "Connecting..." : "🦊 Connect MetaMask"}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};
