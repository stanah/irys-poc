"use client";

import { useState, useCallback, useEffect } from "react";
import { useWalletContext } from "@/contexts/WalletContext";
import { getEnv } from "@/lib/config";
import { VIDEO_TIPPING_ABI } from "@/types/contracts";
import { parseEther, formatEther, keccak256, toBytes } from "viem";
import { createPublicClient, http } from "viem";
import { polygonAmoy } from "viem/chains";
import type { TipRecord } from "@/types/video";

interface TippingWidgetProps {
  videoId: string;
  creatorAddress: string;
  onTipSuccess?: () => void;
}

const TIP_AMOUNTS = [
  { value: "0.001", label: "0.001 ETH" },
  { value: "0.01", label: "0.01 ETH" },
  { value: "0.05", label: "0.05 ETH" },
  { value: "0.1", label: "0.1 ETH" },
];

export function TippingWidget({
  videoId,
  creatorAddress,
  onTipSuccess,
}: TippingWidgetProps) {
  const { address, walletClient, isConnected } = useWalletContext();

  const [amount, setAmount] = useState("0.01");
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tips, setTips] = useState<TipRecord[]>([]);
  const [totalTips, setTotalTips] = useState<bigint>(0n);

  const contractAddress = getEnv().tippingContract;

  // Fetch existing tips
  const fetchTips = useCallback(async () => {
    if (!contractAddress) return;

    try {
      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: http(),
      });

      const videoIdBytes = keccak256(toBytes(videoId));

      // Get total tips
      const total = await publicClient.readContract({
        address: contractAddress,
        abi: VIDEO_TIPPING_ABI,
        functionName: "videoTotalTips",
        args: [videoIdBytes],
      });

      setTotalTips(total as bigint);

      // Get tip records
      const tipRecords = await publicClient.readContract({
        address: contractAddress,
        abi: VIDEO_TIPPING_ABI,
        functionName: "getVideoTips",
        args: [videoIdBytes],
      });

      const records = (tipRecords as any[]).map((record) => ({
        sender: record.sender,
        amount: record.amount,
        message: record.message,
        timestamp: Number(record.timestamp),
      }));

      setTips(records.reverse().slice(0, 5)); // Show latest 5
    } catch (err) {
      console.error("Failed to fetch tips:", err);
    }
  }, [contractAddress, videoId]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const handleTip = async () => {
    if (!walletClient || !address || !contractAddress) {
      setError("Please connect your wallet");
      return;
    }

    const tipAmount = customAmount || amount;
    if (!tipAmount || parseFloat(tipAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const videoIdBytes = keccak256(toBytes(videoId));

      // Check if video is configured
      const publicClient = createPublicClient({
        chain: polygonAmoy,
        transport: http(),
      });

      const isConfigured = await publicClient.readContract({
        address: contractAddress,
        abi: VIDEO_TIPPING_ABI,
        functionName: "isVideoConfigured",
        args: [videoIdBytes],
      });

      if (!isConfigured) {
        // Configure revenue split first
        const { request: configRequest } = await publicClient.simulateContract({
          address: contractAddress,
          abi: VIDEO_TIPPING_ABI,
          functionName: "configureRevenueSplit",
          args: [
            videoIdBytes,
            creatorAddress as `0x${string}`,
            BigInt(85), // 85% to creator
            [], // No copyright holders
            [], // No copyright percentages
          ],
          account: address as `0x${string}`,
        });

        await walletClient.writeContract(configRequest);
      }

      // Send tip
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: VIDEO_TIPPING_ABI,
        functionName: "tip",
        args: [videoIdBytes, message],
        account: address as `0x${string}`,
        value: parseEther(tipAmount),
      });

      const hash = await walletClient.writeContract(request);

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      setSuccess(true);
      setMessage("");
      setCustomAmount("");
      fetchTips();
      onTipSuccess?.();
    } catch (err: any) {
      const errorMessage = err.message || "Failed to send tip";
      if (errorMessage.includes("User rejected")) {
        setError("Transaction was cancelled");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts * 1000);
    return date.toLocaleDateString();
  };

  if (!contractAddress) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
        Tipping is not available (contract not configured)
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Support the Creator</h3>
        {totalTips > 0n && (
          <span className="text-sm text-gray-500">
            Total: {formatEther(totalTips)} ETH
          </span>
        )}
      </div>

      {!isConnected ? (
        <div className="text-center py-4">
          <p className="text-gray-500 mb-2">Connect your wallet to send a tip</p>
        </div>
      ) : (
        <>
          {/* Amount selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <div className="grid grid-cols-4 gap-2">
              {TIP_AMOUNTS.map((tip) => (
                <button
                  key={tip.value}
                  type="button"
                  onClick={() => {
                    setAmount(tip.value);
                    setCustomAmount("");
                  }}
                  className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                    amount === tip.value && !customAmount
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {tip.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Custom amount"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                ETH
              </span>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              rows={2}
              placeholder="Leave a message for the creator..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Error/Success */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
              Tip sent successfully! Thank you for supporting the creator.
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleTip}
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              `Send ${customAmount || amount} ETH`
            )}
          </button>
        </>
      )}

      {/* Recent tips */}
      {tips.length > 0 && (
        <div className="border-t pt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-500">Recent Tips</h4>
          <div className="space-y-2">
            {tips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatAddress(tip.sender)}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-green-600">
                      {formatEther(tip.amount)} ETH
                    </span>
                  </div>
                  {tip.message && (
                    <p className="text-gray-600 mt-0.5">{tip.message}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {formatTimestamp(tip.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
