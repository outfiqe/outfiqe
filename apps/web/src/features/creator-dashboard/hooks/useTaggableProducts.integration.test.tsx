import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { useTaggableProducts } from "./useTaggableProducts";

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useTaggableProducts", () => {
  it("fetches products without a query", async () => {
    mswServer.use(
      http.get("/api/products", ({ request }) => {
        expect(new URL(request.url).searchParams.get("q")).toBeNull();
        return HttpResponse.json({
          success: true,
          message: "Products.",
          data: { products: [], nextCursor: null, total: 0, brandCount: 0 },
        });
      }),
    );

    const { result } = renderHook(() => useTaggableProducts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("passes the search query through as a q param", async () => {
    mswServer.use(
      http.get("/api/products", ({ request }) => {
        expect(new URL(request.url).searchParams.get("q")).toBe("denim");
        return HttpResponse.json({
          success: true,
          message: "Products.",
          data: { products: [], nextCursor: null, total: 0, brandCount: 0 },
        });
      }),
    );

    const { result } = renderHook(() => useTaggableProducts("denim"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("stays disabled and never requests anything when enabled is false", () => {
    const { result } = renderHook(() => useTaggableProducts("denim", false), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
  });
});
