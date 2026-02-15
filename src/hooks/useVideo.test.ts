import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement, type PropsWithChildren } from "react";

// Mock videoService
const mockUploadVideo = vi.fn();
const mockQueryVideos = vi.fn();
const mockGetVideoMetadata = vi.fn();
const mockGetDecryptionAccess = vi.fn();

vi.mock("@/lib/video", () => ({
  videoService: {
    uploadVideo: (...args: unknown[]) => mockUploadVideo(...args),
    queryVideos: (...args: unknown[]) => mockQueryVideos(...args),
    getVideoMetadata: (...args: unknown[]) => mockGetVideoMetadata(...args),
    getDecryptionAccess: (...args: unknown[]) => mockGetDecryptionAccess(...args),
  },
}));

// Mock WalletContext
const mockAddress = "0x1234567890abcdef1234567890abcdef12345678";
const mockWalletClient = { signMessage: vi.fn() };

vi.mock("@/contexts/WalletContext", () => ({
  useWalletContext: () => ({
    address: mockAddress,
    walletClient: mockWalletClient,
  }),
}));

function Wrapper({ children }: PropsWithChildren) {
  return createElement("div", null, children);
}

describe("useVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return initial state", async () => {
    const { useVideo } = await import("@/hooks/useVideo");
    const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBeNull();
    expect(result.current.uploadError).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.videos).toEqual([]);
    expect(result.current.queryError).toBeNull();
  });

  describe("uploadVideo", () => {
    it("should upload video and return videoId", async () => {
      mockUploadVideo.mockResolvedValue("video-id-123");

      const { useVideo } = await import("@/hooks/useVideo");
      const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

      let videoId: string | null = null;
      await act(async () => {
        videoId = await result.current.uploadVideo({
          title: "Test Video",
          description: "A test video",
          file: new File(["test"], "test.mp4", { type: "video/mp4" }),
          category: "gaming",
          tags: ["test"],
          accessType: "public",
        });
      });

      expect(videoId).toBe("video-id-123");
      expect(result.current.isUploading).toBe(false);
      expect(result.current.uploadError).toBeNull();
      expect(mockUploadVideo).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Test Video" }),
        mockWalletClient,
        mockAddress,
        expect.any(Function)
      );
    });

    it("should set error on upload failure", async () => {
      mockUploadVideo.mockRejectedValue(new Error("Upload failed"));

      const { useVideo } = await import("@/hooks/useVideo");
      const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

      let videoId: string | null = null;
      await act(async () => {
        videoId = await result.current.uploadVideo({
          title: "Fail Video",
          description: "",
          file: new File(["test"], "test.mp4"),
          category: "other",
          tags: [],
          accessType: "public",
        });
      });

      expect(videoId).toBeNull();
      expect(result.current.uploadError).toBe("Upload failed");
      expect(result.current.isUploading).toBe(false);
    });

    it("should set error when wallet is not connected", async () => {
      // Override the mock to return null address
      vi.doMock("@/contexts/WalletContext", () => ({
        useWalletContext: () => ({
          address: null,
          walletClient: null,
        }),
      }));
      vi.resetModules();

      const { useVideo } = await import("@/hooks/useVideo");
      const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

      let videoId: string | null = null;
      await act(async () => {
        videoId = await result.current.uploadVideo({
          title: "No Wallet",
          description: "",
          file: new File(["test"], "test.mp4"),
          category: "other",
          tags: [],
          accessType: "public",
        });
      });

      expect(videoId).toBeNull();
      expect(result.current.uploadError).toBe("Wallet not connected");

      // Restore original mock
      vi.doMock("@/contexts/WalletContext", () => ({
        useWalletContext: () => ({
          address: mockAddress,
          walletClient: mockWalletClient,
        }),
      }));
      vi.resetModules();
    });
  });

  describe("fetchVideos", () => {
    it("should fetch and set videos", async () => {
      const mockVideos = [
        {
          id: "video-1",
          title: "Video 1",
          creatorAddress: "0x123",
          createdAt: Date.now(),
          category: "gaming",
          accessType: "public",
          duration: 120,
          totalTips: 0n,
        },
      ];
      mockQueryVideos.mockResolvedValue(mockVideos);

      const { useVideo } = await import("@/hooks/useVideo");
      const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.fetchVideos();
      });

      expect(result.current.videos).toEqual(mockVideos);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.queryError).toBeNull();
    });

    it("should pass query params to service", async () => {
      mockQueryVideos.mockResolvedValue([]);

      const { useVideo } = await import("@/hooks/useVideo");
      const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.fetchVideos({ category: "music", limit: 10 });
      });

      expect(mockQueryVideos).toHaveBeenCalledWith({
        category: "music",
        limit: 10,
      });
    });

    it("should set error when fetch fails", async () => {
      mockQueryVideos.mockRejectedValue(new Error("Network error"));

      const { useVideo } = await import("@/hooks/useVideo");
      const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

      await act(async () => {
        await result.current.fetchVideos();
      });

      expect(result.current.videos).toEqual([]);
      expect(result.current.queryError).toBe("Network error");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("fetchVideoById", () => {
    it("should return video metadata", async () => {
      const metadata = {
        id: "video-1",
        title: "Test",
        creatorAddress: "0x123",
      };
      mockGetVideoMetadata.mockResolvedValue(metadata);

      const { useVideo } = await import("@/hooks/useVideo");
      const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

      let video: unknown = null;
      await act(async () => {
        video = await result.current.fetchVideoById("video-1");
      });

      expect(video).toEqual(metadata);
    });

    it("should return null on error", async () => {
      mockGetVideoMetadata.mockRejectedValue(new Error("Not found"));

      const { useVideo } = await import("@/hooks/useVideo");
      const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

      let video: unknown = "not-null";
      await act(async () => {
        video = await result.current.fetchVideoById("missing");
      });

      expect(video).toBeNull();
    });
  });

  describe("getDecryptionAccess", () => {
    it("should delegate to videoService", async () => {
      mockGetDecryptionAccess.mockResolvedValue({
        canAccess: true,
        authSig: { sig: "test" },
      });

      const { useVideo } = await import("@/hooks/useVideo");
      const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

      let access: unknown = null;
      await act(async () => {
        access = await result.current.getDecryptionAccess("video-1");
      });

      expect(access).toEqual({
        canAccess: true,
        authSig: { sig: "test" },
      });
      expect(mockGetDecryptionAccess).toHaveBeenCalledWith(
        "video-1",
        mockWalletClient,
        mockAddress
      );
    });

    it("should return error when wallet not connected", async () => {
      vi.doMock("@/contexts/WalletContext", () => ({
        useWalletContext: () => ({
          address: null,
          walletClient: null,
        }),
      }));
      vi.resetModules();

      const { useVideo } = await import("@/hooks/useVideo");
      const { result } = renderHook(() => useVideo(), { wrapper: Wrapper });

      let access: unknown = null;
      await act(async () => {
        access = await result.current.getDecryptionAccess("video-1");
      });

      expect(access).toEqual({
        canAccess: false,
        error: "Wallet not connected",
      });

      // Restore original mock
      vi.doMock("@/contexts/WalletContext", () => ({
        useWalletContext: () => ({
          address: mockAddress,
          walletClient: mockWalletClient,
        }),
      }));
      vi.resetModules();
    });
  });
});
