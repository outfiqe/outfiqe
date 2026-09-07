import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { useInfiniteBrandProducts } from "@/features/brand-profile/hooks/useInfiniteBrandProducts";

const BRAND_ID = "brand-123";

const buildProduct = (id: string) => ({
  id,
  brand: "Test Atelier",
  name: `Product ${id}`,
  price: 1200,
  effectivePrice: 1200,
  discountPercent: null,
  type: "tops",
  categorySlugs: ["new-arrivals"],
  imageUrl: null,
  lowStock: false,
  isNew: true,
  creatorBuyerCount: 0,
  unitsSold: 0,
  avgRating: null,
  reviewCount: 0,
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useInfiniteBrandProducts", () => {
  it("fetches the first page of a brand's products", async () => {
    mswServer.use(
      http.get(`/api/brands/${BRAND_ID}/products`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        expect(cursor).toBeNull();

        return HttpResponse.json({
          success: true,
          message: "ok",
          data: {
            products: [buildProduct("p1"), buildProduct("p2")],
            nextCursor: "p2",
            total: 5,
            brandCount: 1,
          },
        });
      }),
    );

    const { result } = renderHook(() => useInfiniteBrandProducts(BRAND_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]?.products).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("requests the next page using the returned cursor", async () => {
    mswServer.use(
      http.get(`/api/brands/${BRAND_ID}/products`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");

        if (!cursor) {
          return HttpResponse.json({
            success: true,
            message: "ok",
            data: { products: [buildProduct("p1")], nextCursor: "p1", total: 2, brandCount: 1 },
          });
        }

        expect(cursor).toBe("p1");
        return HttpResponse.json({
          success: true,
          message: "ok",
          data: { products: [buildProduct("p2")], nextCursor: null, total: 2, brandCount: 1 },
        });
      }),
    );

    const { result } = renderHook(() => useInfiniteBrandProducts(BRAND_ID), { wrapper });

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
});
