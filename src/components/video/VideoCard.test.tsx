import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Import after mocks
import { VideoCard } from "./VideoCard";
import type { VideoListItem } from "@/types/video";

const baseVideo: VideoListItem = {
  id: "video-123",
  title: "Test Video Title",
  thumbnailCid: "thumb-cid-abc",
  duration: 125,
  creatorAddress: "0x1234567890abcdef1234567890abcdef12345678",
  createdAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
  category: "gaming",
  accessType: "public",
  totalTips: 0n,
};

describe("VideoCard", () => {
  describe("rendering", () => {
    it("should render video title", () => {
      render(<VideoCard video={baseVideo} />);
      expect(screen.getByText("Test Video Title")).toBeDefined();
    });

    it("should link to watch page", () => {
      render(<VideoCard video={baseVideo} />);
      const link = screen.getByRole("link");
      expect(link.getAttribute("href")).toBe("/watch/video-123");
    });

    it("should display formatted duration", () => {
      render(<VideoCard video={baseVideo} />);
      // 125 seconds = 2:05
      expect(screen.getByText("2:05")).toBeDefined();
    });

    it("should display category badge", () => {
      render(<VideoCard video={baseVideo} />);
      expect(screen.getByText("gaming")).toBeDefined();
    });

    it("should display truncated creator address", () => {
      render(<VideoCard video={baseVideo} />);
      // 0x1234...5678
      expect(screen.getByText("0x1234...5678")).toBeDefined();
    });

    it("should render thumbnail image when thumbnailCid is provided", () => {
      render(<VideoCard video={baseVideo} />);
      const img = screen.getByAltText("Test Video Title");
      expect(img.getAttribute("src")).toBe(
        "https://gateway.irys.xyz/thumb-cid-abc"
      );
    });

    it("should render placeholder when no thumbnailCid", () => {
      render(<VideoCard video={{ ...baseVideo, thumbnailCid: "" }} />);
      expect(screen.queryByAltText("Test Video Title")).toBeNull();
    });

    it("should show 限定 badge for token-gated videos", () => {
      render(
        <VideoCard video={{ ...baseVideo, accessType: "token-gated" }} />
      );
      expect(screen.getByText("限定")).toBeDefined();
    });

    it("should show 限定 badge for subscription videos", () => {
      render(
        <VideoCard video={{ ...baseVideo, accessType: "subscription" }} />
      );
      expect(screen.getByText("限定")).toBeDefined();
    });

    it("should show 公開 badge for public videos", () => {
      render(<VideoCard video={baseVideo} />);
      expect(screen.getByText("公開")).toBeDefined();
    });

    it("should show tips when totalTips > 0", () => {
      render(
        <VideoCard
          video={{ ...baseVideo, totalTips: BigInt("1000000000000000000") }}
        />
      );
      expect(screen.getByText("1.00 ETH tips")).toBeDefined();
    });

    it("should not show tips when totalTips is 0", () => {
      render(<VideoCard video={baseVideo} />);
      expect(screen.queryByText(/ETH tips/)).toBeNull();
    });
  });

  describe("formatDuration", () => {
    it("should format seconds to mm:ss", () => {
      render(<VideoCard video={{ ...baseVideo, duration: 65 }} />);
      expect(screen.getByText("1:05")).toBeDefined();
    });

    it("should format hours correctly", () => {
      render(<VideoCard video={{ ...baseVideo, duration: 3661 }} />);
      // 1:01:01
      expect(screen.getByText("1:01:01")).toBeDefined();
    });

    it("should display 0:00 for zero duration", () => {
      render(<VideoCard video={{ ...baseVideo, duration: 0 }} />);
      expect(screen.getByText("0:00")).toBeDefined();
    });
  });

  describe("formatDate", () => {
    it("should show 'Yesterday' for 1-day old video", () => {
      const yesterday = Date.now() - 1000 * 60 * 60 * 25; // 25 hours ago
      render(<VideoCard video={{ ...baseVideo, createdAt: yesterday }} />);
      expect(screen.getByText("Yesterday")).toBeDefined();
    });

    it("should show days ago for recent videos", () => {
      const threeDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 3;
      render(<VideoCard video={{ ...baseVideo, createdAt: threeDaysAgo }} />);
      expect(screen.getByText("3 days ago")).toBeDefined();
    });

    it("should show weeks ago", () => {
      const twoWeeksAgo = Date.now() - 1000 * 60 * 60 * 24 * 14;
      render(<VideoCard video={{ ...baseVideo, createdAt: twoWeeksAgo }} />);
      expect(screen.getByText("2 weeks ago")).toBeDefined();
    });
  });
});
