import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { ProductPage } from "../api/productSchemas";
import { useInfiniteProducts } from "./useInfiniteProducts";

const productsKey = [
  "products",
  "tops",
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
];

const realPage: ProductPage = {
  products: [
    {
      id: "prod-1",
      brand: "Studio Nine",
      name: "Everyday Tee",
      price: 1500,
      effectivePrice: 1500,
      discountPercent: null,
      type: "tops",
      categorySlugs: ["tops"],
      imageUrl: null,
      lowStock: false,
      isNew: false,
      creatorBuyerCount: 0,
      unitsSold: 0,
      avgRating: null,
      reviewCount: 0,
    },
  ],
  nextCursor: null,
  total: 1,
  brandCount: 1,
};

describe("useInfiniteProducts", () => {
  it("drops a null page a failed server prefetch left in the cache", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    });
    queryClient.setQueryData(productsKey, {
      pages: [null, realPage],
      pageParams: [undefined, undefined],
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useInfiniteProducts({ category: "tops", enabled: false }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.pages).toEqual([realPage]);
  });
});
