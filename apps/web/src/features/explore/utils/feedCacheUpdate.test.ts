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

const postFromInfinite = (
  data: InfiniteData<FeedPage> | undefined,
  lookId: string,
): FeedPost | undefined =>
  data?.pages.flatMap((page) => page.posts).find((post) => post.id === lookId);

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
      const patched = postFromInfinite(
        queryClient.getQueryData<InfiniteData<FeedPage>>(key),
        "look-1",
      );
      expect(patched?.isLiked).toBe(true);
      expect(patched?.likeCount).toBe(4);
    }
  });

  it("patches a single deep-linked look (usePublicLook cache)", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["creator-looks", "public", "look-1"], buildPost());

    patchPostInFeedCaches(queryClient, "look-1", (post) => ({ ...post, isLiked: true }));

    expect(queryClient.getQueryData<FeedPost>(["creator-looks", "public", "look-1"])?.isLiked).toBe(
      true,
    );
  });

  it("leaves unrelated posts and non-feed caches under the same key prefix untouched", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      ["creator-looks", "asha"],
      asInfinitePage([buildPost(), buildPost({ id: "look-2" })]),
    );
    queryClient.setQueryData(["creator-looks", "detail", "look-1"], { id: "look-1", draft: true });

    patchPostInFeedCaches(queryClient, "look-1", (post) => ({ ...post, isLiked: true }));

    const grid = queryClient.getQueryData<InfiniteData<FeedPage>>(["creator-looks", "asha"]);
    expect(postFromInfinite(grid, "look-1")?.isLiked).toBe(true);
    expect(postFromInfinite(grid, "look-2")?.isLiked).toBe(false);
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

    const feed = queryClient.getQueryData<InfiniteData<FeedPage>>(["explore-feed", "for_you"]);
    expect(feed?.pages.flatMap((page) => page.posts).every((post) => post.isFollowingCreator)).toBe(
      true,
    );
    expect(
      postFromInfinite(queryClient.getQueryData(["creator-looks", "asha"]), "c")
        ?.isFollowingCreator,
    ).toBe(true);
    expect(
      queryClient.getQueryData<FeedPost>(["creator-looks", "public", "d"])?.isFollowingCreator,
    ).toBe(true);
  });
});
