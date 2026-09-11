import {
  type InfiniteData,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enqueueOfflineAction } from "@/features/pwa";

import { exploreFeedApi } from "../api/exploreFeedApi";
import type { FeedPage, FeedPost } from "../api/exploreFeedSchemas";
import { useLikeLook } from "./useLikeLook";

vi.mock("../api/exploreFeedApi", () => ({
  exploreFeedApi: { like: vi.fn(), unlike: vi.fn() },
}));

vi.mock("@/features/pwa", () => ({
  enqueueOfflineAction: vi.fn().mockResolvedValue(undefined),
}));

const renderUseLikeLook = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, ...renderHook(() => useLikeLook(), { wrapper }) };
};

const buildPost = (overrides: Partial<FeedPost> = {}): FeedPost => ({
  id: "1",
  creator: { id: "c1", name: "Asha", handle: "asha", isApproved: true },
  imageUrl: "https://img.test/1.jpg",
  images: ["https://img.test/1.jpg"],
  image: null,
  caption: null,
  likeCount: 2,
  commentCount: 0,
  saveCount: 0,
  isLiked: false,
  isSaved: false,
  isFollowingCreator: false,
  taggedProducts: [],
  hashtags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const infinitePage = (posts: FeedPost[]): InfiniteData<FeedPage> => ({
  pages: [{ posts, nextCursor: null }],
  pageParams: [undefined],
});

afterEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(exploreFeedApi.like).mockReset();
  vi.mocked(exploreFeedApi.unlike).mockReset();
  vi.mocked(enqueueOfflineAction).mockClear();
});

describe("useLikeLook", () => {
  it("calls the real api when there is a connection", async () => {
    vi.mocked(exploreFeedApi.like).mockResolvedValue({ liked: true, likeCount: 1 });
    const { result } = renderUseLikeLook();

    act(() => result.current.mutate({ lookId: "1", liked: false }));

    await waitFor(() => expect(exploreFeedApi.like).toHaveBeenCalledWith("1"));
    expect(enqueueOfflineAction).not.toHaveBeenCalled();
  });

  it("optimistically patches the like into the creator profile grid cache, not just the feed", async () => {
    vi.mocked(exploreFeedApi.unlike).mockResolvedValue({ liked: false, likeCount: 1 });
    const { result, queryClient } = renderUseLikeLook();

    queryClient.setQueryData(
      ["explore-feed", "for_you"],
      infinitePage([buildPost({ isLiked: true, likeCount: 2 })]),
    );
    queryClient.setQueryData(
      ["creator-looks", "asha"],
      infinitePage([buildPost({ isLiked: true, likeCount: 2 })]),
    );
    queryClient.setQueryData(
      ["creator-looks", "public", "1"],
      buildPost({ isLiked: true, likeCount: 2 }),
    );

    act(() => result.current.mutate({ lookId: "1", liked: true }));

    await waitFor(() => expect(exploreFeedApi.unlike).toHaveBeenCalledWith("1"));

    const gridPost = queryClient
      .getQueryData<InfiniteData<FeedPage>>(["creator-looks", "asha"])
      ?.pages.flatMap((page) => page.posts)
      .find((post) => post.id === "1");
    const publicPost = queryClient.getQueryData<FeedPost>(["creator-looks", "public", "1"]);

    expect(gridPost?.isLiked).toBe(false);
    expect(gridPost?.likeCount).toBe(1);
    expect(publicPost?.isLiked).toBe(false);
  });

  it("queues the like instead of calling the api while offline", async () => {
    onlineManager.setOnline(false);
    const { result } = renderUseLikeLook();

    act(() => result.current.mutate({ lookId: "1", liked: false }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(exploreFeedApi.like).not.toHaveBeenCalled();
    expect(enqueueOfflineAction).toHaveBeenCalledWith("like-look", "like-look:1", {
      lookId: "1",
      liked: false,
    });
  });
});
