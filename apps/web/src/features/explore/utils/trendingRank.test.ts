import { describe, expect, it } from "vitest";

import type { FeedPost } from "../api/exploreFeedSchemas";
import { buildTrendingRankByPostId, findTrendingFallbackBoundary } from "./trendingRank";

const buildPost = (overrides: Partial<FeedPost> = {}): FeedPost => ({
  id: "look-1",
  creator: { id: "creator-1", name: "Asha", handle: "asha", isApproved: true },
  imageUrl: "https://img.test/1.jpg",
  images: ["https://img.test/1.jpg"],
  image: null,
  layout: "PORTRAIT",
  caption: null,
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

describe("buildTrendingRankByPostId", () => {
  it("returns no ranks on a tab that isn't ranked, even for genuinely trending posts", () => {
    const posts = [buildPost({ id: "trending-1", isTrending: true })];

    expect(buildTrendingRankByPostId(posts, false).size).toBe(0);
  });

  it("never badges a post that isn't actually trending, even when it sits first in the array", () => {
    const posts = [
      buildPost({ id: "followed-recency-post", isTrending: false }),
      buildPost({ id: "genuinely-trending-post", isTrending: true }),
    ];

    const ranks = buildTrendingRankByPostId(posts, true);

    expect(ranks.has("followed-recency-post")).toBe(false);
    expect(ranks.get("genuinely-trending-post")).toBe(1);
  });

  it("numbers only the genuinely trending posts in order, skipping interleaved followed posts in between", () => {
    const posts = [
      buildPost({ id: "trend-1", isTrending: true }),
      buildPost({ id: "followed-1", isTrending: false }),
      buildPost({ id: "trend-2", isTrending: true }),
      buildPost({ id: "followed-2", isTrending: false }),
      buildPost({ id: "trend-3", isTrending: true }),
    ];

    const ranks = buildTrendingRankByPostId(posts, true);

    expect(ranks.get("trend-1")).toBe(1);
    expect(ranks.get("trend-2")).toBe(2);
    expect(ranks.get("trend-3")).toBe(3);
    expect(ranks.has("followed-1")).toBe(false);
    expect(ranks.has("followed-2")).toBe(false);
  });

  it("stops at the top 3 trending posts, leaving the rest unbadged", () => {
    const posts = [
      buildPost({ id: "trend-1", isTrending: true }),
      buildPost({ id: "trend-2", isTrending: true }),
      buildPost({ id: "trend-3", isTrending: true }),
      buildPost({ id: "trend-4", isTrending: true }),
    ];

    const ranks = buildTrendingRankByPostId(posts, true);

    expect(ranks.get("trend-3")).toBe(3);
    expect(ranks.has("trend-4")).toBe(false);
  });
});

describe("findTrendingFallbackBoundary", () => {
  it("returns -1 on a tab that isn't ranked", () => {
    const posts = [buildPost({ id: "post-1", isTrending: false })];

    expect(findTrendingFallbackBoundary(posts, false)).toBe(-1);
  });

  it("returns -1 when every post is genuinely trending, so there is nothing to divide", () => {
    const posts = [
      buildPost({ id: "trend-1", isTrending: true }),
      buildPost({ id: "trend-2", isTrending: true }),
    ];

    expect(findTrendingFallbackBoundary(posts, true)).toBe(-1);
  });

  it("returns 0 when no post is genuinely trending, so the whole list is fallback", () => {
    const posts = [
      buildPost({ id: "fallback-1", isTrending: false }),
      buildPost({ id: "fallback-2", isTrending: false }),
    ];

    expect(findTrendingFallbackBoundary(posts, true)).toBe(0);
  });

  it("returns the index of the first fallback post in a mixed scored-then-fallback list", () => {
    const posts = [
      buildPost({ id: "trend-1", isTrending: true }),
      buildPost({ id: "trend-2", isTrending: true }),
      buildPost({ id: "fallback-1", isTrending: false }),
      buildPost({ id: "fallback-2", isTrending: false }),
    ];

    expect(findTrendingFallbackBoundary(posts, true)).toBe(2);
  });
});
