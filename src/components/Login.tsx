"use client";

import { useWalletContext } from "@/contexts/WalletContext";
import { useState } from "react";
import { formatEther } from "viem";

export const Login = () => {
  const {
    address,
    connectionType,
    isConnecting,
    isConnected,
    connectWithAA,
    connectWithMetaMask,
    disconnect,
    error,
    lastAttemptedMethod,
    smartAccountAddress,
    balance,
    isBalanceLoading,
  } = useWalletContext();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isConnected && address) {
    const connectionLabel =
      connectionType === "aa" ? "AA（スマートアカウント）" : "MetaMask";
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="text-sm space-y-2">
          <p className="font-semibold text-gray-700">
            接続方式: {connectionLabel}
          </p>
          <div>
            <p className="text-xs text-gray-500">ウォレットアドレス:</p>
            <div className="flex items-center gap-2">
              <p
                className="font-mono text-xs text-gray-700 truncate max-w-[280px]"
                title={address}
              >
                {address}
              </p>
              <button
                onClick={copyAddress}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                title="アドレスをコピー"
              >
                {copied ? "コピー済み" : "コピー"}
              </button>
            </div>
          </div>
          {connectionType === "aa" && smartAccountAddress && (
            <div>
              <p className="text-xs text-gray-500">Smart Account:</p>
              <p
                className="font-mono text-xs text-gray-700 truncate max-w-[280px]"
                title={smartAccountAddress}
              >
                {smartAccountAddress}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">残高 (Polygon Amoy):</p>
            <p className="font-mono text-sm text-gray-700">
              {isBalanceLoading
                ? "残高取得中..."
                : balance !== null
                  ? `${parseFloat(formatEther(balance)).toFixed(4)} ETH`
                  : "残高取得失敗"}
            </p>
          </div>
        </div>
        <button
          onClick={disconnect}
          className="mt-3 w-full px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
        >
          ログアウト
        </button>
      </div>
    );
  }

  const isAAError = error && lastAttemptedMethod === "aa";

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xs">
      {/* Privy login (opens modal with Google & Passkey options) */}
      <button
        onClick={connectWithAA}
        disabled={isConnecting}
        className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? "Connecting..." : "\u30ED\u30B0\u30A4\u30F3 / \u30B5\u30A4\u30F3\u30A2\u30C3\u30D7"}
      </button>

      <div className="flex items-center gap-2 w-full my-1">
        <div className="flex-1 border-t border-gray-300" />
        <span className="text-xs text-gray-400">{"\u307E\u305F\u306F"}</span>
        <div className="flex-1 border-t border-gray-300" />
      </div>

      {/* MetaMask connection */}
      <button
        onClick={connectWithMetaMask}
        disabled={isConnecting}
        className="w-full px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm border border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        MetaMask{"\u3067\u63A5\u7D9A"}
      </button>

      {/* MetaMask not installed guide (AC2) */}
      {error === "MetaMask is not installed" && (
        <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            {"\uD83E\uDD8A"} MetaMask{"\u304C\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3055\u308C\u3066\u3044\u307E\u305B\u3093"}
          </p>
          <p className="text-xs text-amber-700 mb-3">
            MetaMask{"\u306F\u30D6\u30E9\u30A6\u30B6\u62E1\u5F35\u3068\u3057\u3066\u5229\u7528\u3067\u304D\u308BEthereum\u30A6\u30A9\u30EC\u30C3\u30C8\u3067\u3059\u3002"}
          </p>
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            MetaMask{"\u3092\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB"} {"\u2197"}
          </a>
        </div>
      )}

      {/* Error display with MetaMask fallback (FR5) */}
      {error && error !== "MetaMask is not installed" && (
        <div className="text-center w-full">
          <p className="text-red-500 text-sm mb-1">
            {isAAError
              ? "\u30A2\u30AB\u30A6\u30F3\u30C8\u4F5C\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F"
              : error}
          </p>
          {isAAError && (
            <button
              onClick={connectWithMetaMask}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              MetaMask{"\u3067\u30ED\u30B0\u30A4\u30F3"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
