"use client";

import { useState, useCallback, useEffect } from "react";
import { useServiceContext } from "@/contexts/ServiceContext";

interface BalanceData {
  balance: string;
  formatted: string;
}

interface UseIrysBalanceReturn {
  balance: BalanceData | null;
  isLoading: boolean;
  isPending: boolean;
  error: string | null;
  deposit: (amount: string) => Promise<boolean>;
  refreshBalance: () => Promise<void>;
}

export function useIrysBalance(): UseIrysBalanceReturn {
  const { irys } = useServiceContext();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await irys.getBalance();

    if (result.success) {
      setBalance(result.data);
    } else {
      setError(result.error.message);
    }

    setIsLoading(false);
  }, [irys]);

  const deposit = useCallback(async (amount: string): Promise<boolean> => {
    setIsPending(true);
    setError(null);

    const result = await irys.deposit(amount);

    if (result.success) {
      await refreshBalance();
      setIsPending(false);
      return true;
    } else {
      setError(result.error.message);
      setIsPending(false);
      return false;
    }
  }, [irys, refreshBalance]);

  // マウント時に残高取得
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshBalance();
  }, [refreshBalance]);

  return {
    balance,
    isLoading,
    isPending,
    error,
    deposit,
    refreshBalance,
  };
}
