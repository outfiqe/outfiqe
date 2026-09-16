import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthQueryClientWrapper } from "@/features/auth/context/authTestWrapper";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { ExploreFeed } from "./ExploreFeed";

vi.mock("@/shared/lib/socketClient", () => ({
  acquireSocketConnection: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
  getSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
  releaseSocketConnection: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

const FEED_URL = "/api/creator-looks/feed";
const TRENDING_TAGS_URL = "/api/creator-looks/tags/trending";
const SUGGESTED_CREATORS_URL = "/api/follows/suggested-creators";

const buildPost = (overrides: Partial<FeedPost> = {}): FeedPost => ({
  id: "look-1",
  creator: { id: "creator-1", name: "Asha", handle: "asha", isApproved: true },
  imageUrl: "https://img.test/1.jpg",
  images: ["https://img.test/1.jpg"],
  image: null,
  caption: "A look",
  likeCount: 0,
  commentCount: 0,
  saveCount: 0,
  isLiked: false,
  isSaved: false,
  isFollowingCreator: false,
  isTrending: false,
  taggedProducts: [],
  hashtags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const setTab = (tab: string) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams({ tab }) as ReturnType<typeof useSearchParams>,
  );
};

const mockFeedResponse = (posts: FeedPost[]) => {
  mswServer.use(
    http.get(FEED_URL, () =>
      HttpResponse.json({ success: true, message: "Feed.", data: { posts, nextCursor: null } }),
    ),
    http.get(TRENDING_TAGS_URL, () =>
      HttpResponse.json({ success: true, message: "Tags.", data: { tags: [] } }),
    ),
    http.get(SUGGESTED_CREATORS_URL, () =>
      HttpResponse.json({ success: true, message: "Suggested creators.", data: { creators: [] } }),
    ),
  );
};

beforeEach(() => {
  mockNextRouter();
});

describe("ExploreFeed trending section split", () => {
  it("shows the recent & popular divider once, right before the first non-trending post", async () => {
    setTab("trending");
    mockFeedResponse([
      buildPost({ id: "trend-1", isTrending: true }),
      buildPost({ id: "trend-2", isTrending: true }),
      buildPost({ id: "fallback-1", isTrending: false }),
      buildPost({ id: "fallback-2", isTrending: false }),
    ]);

    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    expect(await screen.findAllByText("Recent & popular")).toHaveLength(1);
  });

  it("does not show a divider when every trending post is genuinely trending", async () => {
    setTab("trending");
    mockFeedResponse([
      buildPost({ id: "trend-1", isTrending: true }),
      buildPost({ id: "trend-2", isTrending: true }),
    ]);

    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    await screen.findAllByText("A look");
    expect(screen.queryByText("Recent & popular")).not.toBeInTheDocument();
  });

  it("does not show a divider when nothing is genuinely trending, since there is nothing scored to lead with", async () => {
    setTab("trending");
    mockFeedResponse([
      buildPost({ id: "fallback-1", isTrending: false }),
      buildPost({ id: "fallback-2", isTrending: false }),
    ]);

    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    await screen.findAllByText("A look");
    expect(screen.queryByText("Recent & popular")).not.toBeInTheDocument();
  });

  it("shows a trending-specific empty state only on the trending tab", async () => {
    setTab("trending");
    mockFeedResponse([]);

    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    expect(
      await screen.findByText("Nothing is trending right now. Check back soon."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nothing here yet — try a different tab.")).not.toBeInTheDocument();
  });

  it("shows the generic empty state on the for_you tab, not the trending copy", async () => {
    setTab("for_you");
    mockFeedResponse([]);

    render(<ExploreFeed />, { wrapper: createAuthQueryClientWrapper() });

    expect(await screen.findByText("Nothing here yet — try a different tab.")).toBeInTheDocument();
    expect(
      screen.queryByText("Nothing is trending right now. Check back soon."),
    ).not.toBeInTheDocument();
  });
});
