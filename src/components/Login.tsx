"use client";

import { AuthCard, useUser, useLogout, useSignerStatus } from "@account-kit/react";
import { useEffect, useState } from "react";

export const Login = () => {
  const user = useUser();
  const { logout } = useLogout();
  const { status } = useSignerStatus();
  
  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

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

  // Use embedded AuthCard instead of modal
  return (
    <div className="w-full max-w-md">
      <AuthCard />
    </div>
  );
};
