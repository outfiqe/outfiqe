import { type InfiniteData, QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { FeedPage, FeedPost } from "../api/exploreFeedSchemas";
import { patchCreatorInFeedCaches, patchPostInFeedCaches } from "./feedCacheUpdate";

const buildPost = (overrides: Partial<FeedPost> = {}): FeedPost => ({
  id: "look-1",
  creator: { id: "creator-1", name: "Asha", handle: "asha", isApproved: true },
  imageUrl: "https://img.test/1.jpg",
  images: ["https://img.test/1.jpg"],
  image: null,
  caption: null,
  likeCount: 3,
  commentCount: 0,
  saveCount: 1,
  isLiked: false,
  isSaved: false,
  isFollowingCreator: false,
  taggedProducts: [],
  hashtags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const asInfinitePage = (posts: FeedPost[]): InfiniteData<FeedPage> => ({
  pages: [{ posts, nextCursor: null }],
  pageParams: [undefined],
});

const firstPost = (data: InfiniteData<FeedPage>) => data.pages[0].posts[0];

describe("patchPostInFeedCaches", () => {
  it("patches the post across the explore feed, saved grid, creator grid and look search caches", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["explore-feed", "for_you"], asInfinitePage([buildPost()]));
    queryClient.setQueryData(["saved-posts"], asInfinitePage([buildPost()]));
    queryClient.setQueryData(["creator-looks", "asha"], asInfinitePage([buildPost()]));
    queryClient.setQueryData(["look-search", "linen"], asInfinitePage([buildPost()]));

    patchPostInFeedCaches(queryClient, "look-1", (post) => ({
      ...post,
      isLiked: true,
      likeCount: post.likeCount + 1,
    }));

    for (const key of [
      ["explore-feed", "for_you"],
      ["saved-posts"],
      ["creator-looks", "asha"],
      ["look-search", "linen"],
    ]) {
      const patched = firstPost(queryClient.getQueryData(key) as InfiniteData<FeedPage>);
      expect(patched.isLiked).toBe(true);
      expect(patched.likeCount).toBe(4);
    }
  });

  it("patches a single deep-linked look (usePublicLook cache)", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["creator-looks", "public", "look-1"], buildPost());

    patchPostInFeedCaches(queryClient, "look-1", (post) => ({ ...post, isLiked: true }));

    expect(
      (queryClient.getQueryData(["creator-looks", "public", "look-1"]) as FeedPost).isLiked,
    ).toBe(true);
  });

  it("leaves unrelated posts and non-feed caches under the same key prefix untouched", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      ["creator-looks", "asha"],
      asInfinitePage([buildPost(), buildPost({ id: "look-2" })]),
    );
    queryClient.setQueryData(["creator-looks", "detail", "look-1"], { id: "look-1", draft: true });

    patchPostInFeedCaches(queryClient, "look-1", (post) => ({ ...post, isLiked: true }));

    const grid = queryClient.getQueryData(["creator-looks", "asha"]) as InfiniteData<FeedPage>;
    expect(grid.pages[0].posts[0].isLiked).toBe(true);
    expect(grid.pages[0].posts[1].isLiked).toBe(false);
    expect(queryClient.getQueryData(["creator-looks", "detail", "look-1"])).toEqual({
      id: "look-1",
      draft: true,
    });
  });
});

describe("patchCreatorInFeedCaches", () => {
  it("updates isFollowingCreator on every post by that creator, across caches", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      ["explore-feed", "for_you"],
      asInfinitePage([buildPost({ id: "a" }), buildPost({ id: "b" })]),
    );
    queryClient.setQueryData(["creator-looks", "asha"], asInfinitePage([buildPost({ id: "c" })]));
    queryClient.setQueryData(["creator-looks", "public", "d"], buildPost({ id: "d" }));

    patchCreatorInFeedCaches(queryClient, "creator-1", true);

    const feed = queryClient.getQueryData(["explore-feed", "for_you"]) as InfiniteData<FeedPage>;
    expect(feed.pages[0].posts.every((post) => post.isFollowingCreator)).toBe(true);
    expect(
      firstPost(queryClient.getQueryData(["creator-looks", "asha"]) as InfiniteData<FeedPage>)
        .isFollowingCreator,
    ).toBe(true);
    expect(
      (queryClient.getQueryData(["creator-looks", "public", "d"]) as FeedPost).isFollowingCreator,
    ).toBe(true);
  });
});
