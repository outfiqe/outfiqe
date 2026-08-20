import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { useInfiniteCreatorLooks } from "@/features/creator-profile/hooks/useInfiniteCreatorLooks";

const HANDLE = "ava-martinez";

const buildPost = (id: string) => ({
  id,
  creator: { id: "creator-1", name: "Ava Martinez", handle: HANDLE, isApproved: true },
  imageUrl: `https://cdn.test/${id}.jpg`,
  images: [`https://cdn.test/${id}.jpg`],
  caption: `Post ${id}`,
  likeCount: 0,
  commentCount: 0,
  saveCount: 0,
  isLiked: false,
  isSaved: false,
  isFollowingCreator: false,
  taggedProducts: [],
  hashtags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useInfiniteCreatorLooks", () => {
  it("fetches the first page of a creator's posts", async () => {
    mswServer.use(
      http.get(`/api/creators/by-handle/${HANDLE}/looks`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        expect(cursor).toBeNull();

        return HttpResponse.json({
          success: true,
          message: "Creator's posts.",
          data: { posts: [buildPost("p1"), buildPost("p2")], nextCursor: "p2" },
        });
      }),
    );

    const { result } = renderHook(() => useInfiniteCreatorLooks(HANDLE), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]?.posts).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("requests the next page using the returned cursor", async () => {
    mswServer.use(
      http.get(`/api/creators/by-handle/${HANDLE}/looks`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");

        if (!cursor) {
          return HttpResponse.json({
            success: true,
            message: "Creator's posts.",
            data: { posts: [buildPost("p1")], nextCursor: "p1" },
          });
        }

        expect(cursor).toBe("p1");
        return HttpResponse.json({
          success: true,
          message: "Creator's posts.",
          data: { posts: [buildPost("p2")], nextCursor: null },
        });
      }),
    );

    const { result } = renderHook(() => useInfiniteCreatorLooks(HANDLE), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    void result.current.fetchNextPage();
    await waitFor(
      () => {
        expect(result.current.isFetchingNextPage).toBe(false);
        expect(result.current.data?.pages).toHaveLength(2);
      },
      { timeout: 5000 },
    );

    expect(result.current.hasNextPage).toBe(false);
  });

  it("surfaces an error state when the request fails", async () => {
    mswServer.use(
      http.get(`/api/creators/by-handle/${HANDLE}/looks`, () =>
        HttpResponse.json({ success: false, message: "Server error" }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useInfiniteCreatorLooks(HANDLE), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
