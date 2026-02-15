import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";

// Mock livepeerService
const mockGetAsset = vi.fn();

vi.mock("@/lib/livepeer", () => ({
  livepeerService: {
    getAsset: (...args: unknown[]) => mockGetAsset(...args),
  },
}));

function Wrapper({ children }: PropsWithChildren) {
  return createElement("div", null, children);
}

describe("useTranscode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return initial state", async () => {
    const { useTranscode } = await import("@/hooks/useTranscode");
    const { result } = renderHook(() => useTranscode(), { wrapper: Wrapper });

    expect(result.current.status).toBeNull();
    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe("startPolling", () => {
    it("should start polling and set initial status to waiting", async () => {
      mockGetAsset.mockResolvedValue({
        success: true,
        data: { status: { phase: "processing", progress: 0.5 } },
      });

      const { useTranscode } = await import("@/hooks/useTranscode");
      const { result } = renderHook(() => useTranscode(), { wrapper: Wrapper });

      await act(async () => {
        result.current.startPolling("asset-123");
      });

      expect(result.current.isPolling).toBe(true);
      expect(mockGetAsset).toHaveBeenCalledWith("asset-123");
    });

    it("should stop polling when status is ready", async () => {
      mockGetAsset.mockResolvedValue({
        success: true,
        data: { status: { phase: "ready" } },
      });

      const { useTranscode } = await import("@/hooks/useTranscode");
      const { result } = renderHook(() => useTranscode(), { wrapper: Wrapper });

      await act(async () => {
        result.current.startPolling("asset-123");
      });

      expect(result.current.isPolling).toBe(false);
      expect(result.current.status?.phase).toBe("ready");
      expect(result.current.error).toBeNull();
    });

    it("should stop polling and set error when status is failed", async () => {
      mockGetAsset.mockResolvedValue({
        success: true,
        data: { status: { phase: "failed", errorMessage: "Transcode error" } },
      });

      const { useTranscode } = await import("@/hooks/useTranscode");
      const { result } = renderHook(() => useTranscode(), { wrapper: Wrapper });

      await act(async () => {
        result.current.startPolling("asset-123");
      });

      expect(result.current.isPolling).toBe(false);
      expect(result.current.error).toBe("Transcode error");
    });

    it("should use default error message when failed without errorMessage", async () => {
      mockGetAsset.mockResolvedValue({
        success: true,
        data: { status: { phase: "failed" } },
      });

      const { useTranscode } = await import("@/hooks/useTranscode");
      const { result } = renderHook(() => useTranscode(), { wrapper: Wrapper });

      await act(async () => {
        result.current.startPolling("asset-123");
      });

      expect(result.current.error).toBe("Transcode failed");
    });

    it("should set error when getAsset returns failure Result", async () => {
      mockGetAsset.mockResolvedValue({
        success: false,
        error: {
          category: 'livepeer',
          code: 'ASSET_NOT_FOUND',
          message: '動画が見つかりません',
          retryable: false,
        },
      });

      const { useTranscode } = await import("@/hooks/useTranscode");
      const { result } = renderHook(() => useTranscode(), { wrapper: Wrapper });

      await act(async () => {
        result.current.startPolling("asset-123");
      });

      expect(result.current.error).toBe("動画が見つかりません");
    });

    it("should poll at 5 second intervals", async () => {
      let callCount = 0;
      mockGetAsset.mockImplementation(async () => {
        callCount++;
        if (callCount >= 3) {
          return { success: true, data: { status: { phase: "ready" } } };
        }
        return { success: true, data: { status: { phase: "processing", progress: 0.5 } } };
      });

      const { useTranscode } = await import("@/hooks/useTranscode");
      const { result } = renderHook(() => useTranscode(), { wrapper: Wrapper });

      await act(async () => {
        result.current.startPolling("asset-123");
      });

      // Initial call already happened
      expect(mockGetAsset).toHaveBeenCalledTimes(1);

      // Advance 5 seconds
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockGetAsset).toHaveBeenCalledTimes(2);

      // Advance another 5 seconds - should stop (ready on 3rd call)
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockGetAsset).toHaveBeenCalledTimes(3);
      expect(result.current.isPolling).toBe(false);
    });
  });

  describe("stopPolling", () => {
    it("should stop polling when called manually", async () => {
      mockGetAsset.mockResolvedValue({
        success: true,
        data: { status: { phase: "processing", progress: 0.3 } },
      });

      const { useTranscode } = await import("@/hooks/useTranscode");
      const { result } = renderHook(() => useTranscode(), { wrapper: Wrapper });

      await act(async () => {
        result.current.startPolling("asset-123");
      });

      expect(result.current.isPolling).toBe(true);

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);

      // Advance timers - should not make additional calls
      const callsBefore = mockGetAsset.mock.calls.length;
      await act(async () => {
        vi.advanceTimersByTime(10000);
      });
      expect(mockGetAsset.mock.calls.length).toBe(callsBefore);
    });
  });

  describe("restart polling", () => {
    it("should stop existing polling when startPolling is called again", async () => {
      mockGetAsset.mockResolvedValue({
        success: true,
        data: { status: { phase: "processing", progress: 0.5 } },
      });

      const { useTranscode } = await import("@/hooks/useTranscode");
      const { result } = renderHook(() => useTranscode(), { wrapper: Wrapper });

      await act(async () => {
        result.current.startPolling("asset-1");
      });

      // Start polling for a different asset
      await act(async () => {
        result.current.startPolling("asset-2");
      });

      // Only the latest asset should be polled
      const lastCall = mockGetAsset.mock.calls[mockGetAsset.mock.calls.length - 1];
      expect(lastCall[0]).toBe("asset-2");
    });
  });
});
