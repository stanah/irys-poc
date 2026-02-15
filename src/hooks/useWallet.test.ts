import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";

// Mock Privy SDK
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockUsePrivy = vi.fn();
const mockUseWallets = vi.fn();

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => mockUsePrivy(),
  useWallets: () => mockUseWallets(),
}));

// Mock permissionless
vi.mock("permissionless/accounts", () => ({
  toSimpleSmartAccount: vi.fn().mockResolvedValue({
    address: "0xSmartAccount1234567890abcdef1234567890ab" as `0x${string}`,
  }),
}));

// Mock viem
const mockGetBalance = vi.fn().mockResolvedValue(BigInt("1000000000000000000")); // 1 ETH
vi.mock("viem", async () => {
  const actual = await vi.importActual("viem");
  return {
    ...actual,
    createPublicClient: vi.fn().mockReturnValue({
      getBalance: (...args: unknown[]) => mockGetBalance(...args),
    }),
    createWalletClient: vi.fn().mockReturnValue({ account: "0xMock" }),
  };
});

// Minimal wrapper (Privy hooks are mocked, no actual provider needed)
function Wrapper({ children }: PropsWithChildren) {
  return createElement("div", null, children);
}

describe("useWallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBalance.mockResolvedValue(BigInt("1000000000000000000")); // 1 ETH
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
      login: mockLogin,
      logout: mockLogout,
    });
    mockUseWallets.mockReturnValue({ wallets: [] });
    // Reset window.ethereum
    if (typeof window !== "undefined") {
      (window as Record<string, unknown>).ethereum = undefined;
    }
  });

  it("should return initial disconnected state", async () => {
    const { useWallet } = await import("@/hooks/useWallet");
    const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionType).toBeNull();
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.smartAccountAddress).toBeNull();
    expect(result.current.lastAttemptedMethod).toBeNull();
    expect(result.current.balance).toBeNull();
    expect(result.current.isBalanceLoading).toBe(false);
  });

  describe("MetaMask connection", () => {
    const setupEthereum = (overrides?: {
      requestImpl?: (args: { method: string; params?: unknown[] }) => unknown;
    }) => {
      const defaultImpl = ({ method }: { method: string }) => {
        if (method === "eth_requestAccounts") return ["0x1234567890abcdef1234567890abcdef12345678"];
        if (method === "eth_chainId") return "0x13882"; // Polygon Amoy
        return null;
      };
      const mockRequest = vi.fn().mockImplementation(overrides?.requestImpl ?? defaultImpl);
      const mockOn = vi.fn();
      const mockRemoveListener = vi.fn();
      (window as Record<string, unknown>).ethereum = {
        request: mockRequest,
        on: mockOn,
        removeListener: mockRemoveListener,
      };
      return { mockRequest, mockOn, mockRemoveListener };
    };

    it("should connect via MetaMask when window.ethereum is available", async () => {
      setupEthereum();

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.address).toBe("0x1234567890abcdef1234567890abcdef12345678");
      expect(result.current.connectionType).toBe("metamask");
      expect(result.current.lastAttemptedMethod).toBe("metamask");
      expect(result.current.smartAccountAddress).toBeNull();
    });

    it("should set error when MetaMask is not installed", async () => {
      (window as Record<string, unknown>).ethereum = undefined;

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe("MetaMask is not installed");
      expect(result.current.lastAttemptedMethod).toBe("metamask");
    });

    it("should set error when no accounts returned", async () => {
      setupEthereum({
        requestImpl: ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") return [];
          return null;
        },
      });

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe("No accounts found");
    });

    it("should reject invalid Ethereum address from wallet", async () => {
      setupEthereum({
        requestImpl: ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") return ["not-a-valid-address"];
          return null;
        },
      });

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe("Invalid Ethereum address returned from wallet");
    });

    it("should switch network when chainId does not match Polygon Amoy", async () => {
      const { mockRequest } = setupEthereum({
        requestImpl: ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") return ["0x1234567890abcdef1234567890abcdef12345678"];
          if (method === "eth_chainId") return "0x1"; // Ethereum mainnet
          if (method === "wallet_switchEthereumChain") return null;
          return null;
        },
      });

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      expect(mockRequest).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x13882" }],
      });
      expect(result.current.isConnected).toBe(true);
    });

    it("should add network when chain is not registered (error 4902)", async () => {
      const { mockRequest } = setupEthereum({
        requestImpl: ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") return ["0x1234567890abcdef1234567890abcdef12345678"];
          if (method === "eth_chainId") return "0x1";
          if (method === "wallet_switchEthereumChain") {
            const err = new Error("Chain not added") as Error & { code: number };
            err.code = 4902;
            throw err;
          }
          if (method === "wallet_addEthereumChain") return null;
          return null;
        },
      });

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "wallet_addEthereumChain",
        }),
      );
      expect(result.current.isConnected).toBe(true);
    });

    it("should set error when user rejects network switch", async () => {
      setupEthereum({
        requestImpl: ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") return ["0x1234567890abcdef1234567890abcdef12345678"];
          if (method === "eth_chainId") return "0x1";
          if (method === "wallet_switchEthereumChain") {
            const err = new Error("User rejected") as Error & { code: number };
            err.code = 4001;
            throw err;
          }
          return null;
        },
      });

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe("Polygon Amoyテストネットへの切り替えに失敗しました");
    });

    it("should disconnect with error message when chainChanged to non-Polygon Amoy network", async () => {
      const { mockOn } = setupEthereum();

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      // Connect first
      await act(async () => {
        await result.current.connectWithMetaMask();
      });
      expect(result.current.isConnected).toBe(true);

      // Get the chainChanged handler
      const chainChangedCall = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "chainChanged",
      );
      expect(chainChangedCall).toBeDefined();
      const handleChainChanged = chainChangedCall![1] as (chainId: string) => void;

      // Simulate chain change to a different network
      act(() => {
        handleChainChanged("0x1"); // Ethereum mainnet
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.address).toBeNull();
      expect(result.current.error).toBe("ネットワークがPolygon Amoyから変更されたため、切断されました");
    });

    it("should not disconnect when chainChanged to Polygon Amoy", async () => {
      const { mockOn } = setupEthereum();

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      // Connect first
      await act(async () => {
        await result.current.connectWithMetaMask();
      });
      expect(result.current.isConnected).toBe(true);

      // Get the chainChanged handler
      const chainChangedCall = mockOn.mock.calls.find(
        (call: unknown[]) => call[0] === "chainChanged",
      );
      expect(chainChangedCall).toBeDefined();
      const handleChainChanged = chainChangedCall![1] as (chainId: string) => void;

      // Simulate chain change to Polygon Amoy (noop)
      act(() => {
        handleChainChanged("0x13882"); // Polygon Amoy
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("should set error when wallet_addEthereumChain is rejected", async () => {
      setupEthereum({
        requestImpl: ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") return ["0x1234567890abcdef1234567890abcdef12345678"];
          if (method === "eth_chainId") return "0x1";
          if (method === "wallet_switchEthereumChain") {
            const err = new Error("Chain not added") as Error & { code: number };
            err.code = 4902;
            throw err;
          }
          if (method === "wallet_addEthereumChain") {
            throw new Error("User rejected adding chain");
          }
          return null;
        },
      });

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe("Polygon Amoyテストネットの追加に失敗しました");
    });

    it("should have all UnifiedWallet fields after MetaMask connection", async () => {
      setupEthereum();

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      // Verify all UnifiedWallet fields
      expect(result.current.address).toBe("0x1234567890abcdef1234567890abcdef12345678");
      expect(result.current.walletClient).toBeDefined();
      expect(result.current.connectionType).toBe("metamask");
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.smartAccountAddress).toBeNull();
      expect(result.current.lastAttemptedMethod).toBe("metamask");
      expect(typeof result.current.connectWithAA).toBe("function");
      expect(typeof result.current.connectWithMetaMask).toBe("function");
      expect(typeof result.current.disconnect).toBe("function");
    });
  });

  describe("AA connection", () => {
    it("should call Privy login when connectWithAA is called", async () => {
      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithAA();
      });

      expect(mockLogin).toHaveBeenCalled();
      expect(result.current.isConnecting).toBe(true);
      expect(result.current.lastAttemptedMethod).toBe("aa");
    });

    it("should set error when Privy is not ready", async () => {
      mockUsePrivy.mockReturnValue({
        ready: false,
        authenticated: false,
        login: mockLogin,
        logout: mockLogout,
      });

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithAA();
      });

      expect(mockLogin).not.toHaveBeenCalled();
      expect(result.current.error).toBe("Privy is not ready");
    });

    it("should set up AA wallet when authenticated with embedded wallet", async () => {
      mockUsePrivy.mockReturnValue({
        ready: true,
        authenticated: true,
        login: mockLogin,
        logout: mockLogout,
      });

      const mockProvider = {
        request: vi.fn().mockResolvedValue(null),
      };
      mockUseWallets.mockReturnValue({
        wallets: [
          {
            walletClientType: "privy",
            address: "0xaabbccdd11223344556677889900aabbccddeeff",
            getEthereumProvider: vi.fn().mockResolvedValue(mockProvider),
          },
        ],
      });

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(result.current.connectionType).toBe("aa");
      expect(result.current.address).toBe("0xaabbccdd11223344556677889900aabbccddeeff");
      expect(result.current.smartAccountAddress).toBe("0xSmartAccount1234567890abcdef1234567890ab");
    });
  });

  describe("disconnect", () => {
    it("should reset state on disconnect from MetaMask", async () => {
      const mockRequest = vi.fn().mockImplementation(({ method }: { method: string }) => {
        if (method === "eth_requestAccounts") return ["0x1234567890abcdef1234567890abcdef12345678"];
        if (method === "eth_chainId") return "0x13882";
        return null;
      });
      (window as Record<string, unknown>).ethereum = {
        request: mockRequest,
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.address).toBeNull();
      expect(result.current.connectionType).toBeNull();
    });

    it("should call Privy logout on disconnect from AA", async () => {
      mockUsePrivy.mockReturnValue({
        ready: true,
        authenticated: true,
        login: mockLogin,
        logout: mockLogout,
      });

      const mockProvider = {
        request: vi.fn().mockResolvedValue(null),
      };
      mockUseWallets.mockReturnValue({
        wallets: [
          {
            walletClientType: "privy",
            address: "0xaabbccdd11223344556677889900aabbccddeeff",
            getEthereumProvider: vi.fn().mockResolvedValue(mockProvider),
          },
        ],
      });

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockLogout).toHaveBeenCalled();
    });

    it("should clear balance on disconnect from MetaMask", async () => {
      const mockRequest = vi.fn().mockImplementation(({ method }: { method: string }) => {
        if (method === "eth_requestAccounts") return ["0x1234567890abcdef1234567890abcdef12345678"];
        if (method === "eth_chainId") return "0x13882";
        return null;
      });
      (window as Record<string, unknown>).ethereum = {
        request: mockRequest,
        on: vi.fn(),
        removeListener: vi.fn(),
      };

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      await waitFor(() => {
        expect(result.current.balance).toBe(BigInt("1000000000000000000"));
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.balance).toBeNull();
      expect(result.current.isBalanceLoading).toBe(false);
    });
  });

  describe("balance", () => {
    const setupEthereum = () => {
      const mockRequest = vi.fn().mockImplementation(({ method }: { method: string }) => {
        if (method === "eth_requestAccounts") return ["0x1234567890abcdef1234567890abcdef12345678"];
        if (method === "eth_chainId") return "0x13882";
        return null;
      });
      (window as Record<string, unknown>).ethereum = {
        request: mockRequest,
        on: vi.fn(),
        removeListener: vi.fn(),
      };
      return { mockRequest };
    };

    it("should fetch balance after MetaMask connection", async () => {
      setupEthereum();

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      await waitFor(() => {
        expect(result.current.balance).toBe(BigInt("1000000000000000000"));
      });

      expect(mockGetBalance).toHaveBeenCalledWith({
        address: "0x1234567890abcdef1234567890abcdef12345678",
      });
      expect(result.current.isBalanceLoading).toBe(false);
    });

    it("should fetch balance after AA connection", async () => {
      mockUsePrivy.mockReturnValue({
        ready: true,
        authenticated: true,
        login: mockLogin,
        logout: mockLogout,
      });

      const mockProvider = {
        request: vi.fn().mockResolvedValue(null),
      };
      mockUseWallets.mockReturnValue({
        wallets: [
          {
            walletClientType: "privy",
            address: "0xaabbccdd11223344556677889900aabbccddeeff",
            getEthereumProvider: vi.fn().mockResolvedValue(mockProvider),
          },
        ],
      });

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.balance).toBe(BigInt("1000000000000000000"));
      });

      expect(mockGetBalance).toHaveBeenCalledWith({
        address: "0xaabbccdd11223344556677889900aabbccddeeff",
      });
    });

    it("should handle balance fetch failure gracefully", async () => {
      mockGetBalance.mockRejectedValueOnce(new Error("RPC error"));
      setupEthereum();

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      await waitFor(() => {
        expect(result.current.isBalanceLoading).toBe(false);
      });

      expect(result.current.balance).toBeNull();
      // Other state should not be affected
      expect(result.current.isConnected).toBe(true);
      expect(result.current.address).toBe("0x1234567890abcdef1234567890abcdef12345678");
    });

    it("should transition isBalanceLoading correctly during fetch", async () => {
      // Make getBalance slow to observe loading state
      let resolveBalance: (value: bigint) => void;
      mockGetBalance.mockImplementationOnce(
        () => new Promise<bigint>((resolve) => { resolveBalance = resolve; }),
      );
      setupEthereum();

      const { useWallet } = await import("@/hooks/useWallet");
      const { result } = renderHook(() => useWallet(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.connectWithMetaMask();
      });

      // M3 fix: Verify isBalanceLoading is true while fetch is in progress
      await waitFor(() => {
        expect(result.current.isBalanceLoading).toBe(true);
      });
      expect(result.current.isConnected).toBe(true);
      expect(result.current.balance).toBeNull();

      // Resolve the balance fetch
      await act(async () => {
        resolveBalance!(BigInt("500000000000000000"));
      });

      await waitFor(() => {
        expect(result.current.isBalanceLoading).toBe(false);
      });
      expect(result.current.balance).toBe(BigInt("500000000000000000"));
    });
  });
});
