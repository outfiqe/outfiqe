import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { useInfiniteBrands } from "@/features/brands/hooks/useInfiniteBrands";

const buildBrand = (id: string) => ({
  id,
  name: `Brand ${id}`,
  avatarUrl: null,
  bannerUrl: null,
  madeInNepal: true,
  rating: null,
  productCount: 4,
  followerCount: 10,
  isFollowing: false,
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useInfiniteBrands", () => {
  it("fetches the first page of brands", async () => {
    mswServer.use(
      http.get("/api/brands", ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        expect(cursor).toBeNull();

        return HttpResponse.json({
          success: true,
          message: "Brands.",
          data: { brands: [buildBrand("b1"), buildBrand("b2")], nextCursor: "b2", total: 5 },
        });
      }),
    );

    const { result } = renderHook(() => useInfiniteBrands(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]?.brands).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("requests the next page using the returned cursor", async () => {
    mswServer.use(
      http.get("/api/brands", ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");

        if (!cursor) {
          return HttpResponse.json({
            success: true,
            message: "Brands.",
            data: { brands: [buildBrand("b1")], nextCursor: "b1", total: 2 },
          });
        }

        expect(cursor).toBe("b1");
        return HttpResponse.json({
          success: true,
          message: "Brands.",
          data: { brands: [buildBrand("b2")], nextCursor: null, total: 2 },
        });
      }),
    );

    const { result } = renderHook(() => useInfiniteBrands(), { wrapper });

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
      http.get("/api/brands", () =>
        HttpResponse.json({ success: false, message: "Server error" }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useInfiniteBrands(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
