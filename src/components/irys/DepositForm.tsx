"use client";

import { useState } from "react";
import { useIrysBalance } from "@/hooks/useIrysBalance";

const PRESETS = [
  { label: "0.001 ETH", value: "0.001" },
  { label: "0.005 ETH", value: "0.005" },
  { label: "0.01 ETH", value: "0.01" },
];

export function DepositForm() {
  const { balance, isPending, error, deposit, isLoading } = useIrysBalance();
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);

  const handleDeposit = async () => {
    setSuccess(false);
    const result = await deposit(amount);
    if (result) {
      setSuccess(true);
      setAmount("");
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 space-y-4 border border-gray-200">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Irys ストレージ残高</h3>
        <span className="text-lg font-mono">
          {isLoading ? "..." : `${balance?.formatted ?? "0"} ETH`}
        </span>
      </div>

      {/* プリセットボタン */}
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setAmount(p.value)}
            className="px-3 py-1 text-sm border rounded-full hover:bg-gray-100 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 入力 + ボタン */}
      <div className="flex gap-2">
        <input
          type="number"
          step="0.001"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="デポジット額 (ETH)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleDeposit}
          disabled={isPending || !amount || Number(amount) <= 0}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              処理中...
            </span>
          ) : (
            "デポジット"
          )}
        </button>
      </div>

      {success && (
        <p className="text-green-600 text-sm">デポジットが完了しました</p>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
