"use client";

import { useAuthModal, useUser, useLogout, useSignerStatus } from "@account-kit/react";
import { useEffect, useState } from "react";

export const Login = () => {
  const { openAuthModal } = useAuthModal();
  const user = useUser();
  const { logout } = useLogout();
  const { status } = useSignerStatus();
  
  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isLoading = status === "INITIALIZING" || status === "AUTHENTICATING_EMAIL" || status === "AUTHENTICATING_PASSKEY";

  if (user) {
    return (
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="text-sm">
          <p className="font-semibold text-gray-700">Logged in</p>
          <p className="font-mono text-xs text-gray-500 truncate max-w-[150px]" title={user.address}>
            {user.address}
          </p>
        </div>
        <button
          onClick={() => logout()}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={openAuthModal}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Connecting..." : "Login with Email"}
    </button>
  );
};
