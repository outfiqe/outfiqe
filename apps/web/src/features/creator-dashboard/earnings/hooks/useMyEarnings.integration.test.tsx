import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { CommissionSource, CommissionStatus } from "../api/commissionSchemas";
import { useMyEarnings } from "./useMyEarnings";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
}));

const buildCommission = (id: string) => ({
  id,
  productName: `Product ${id}`,
  brandName: "Studio Nine",
  imageUrl: null,
  source: CommissionSource.TAG_CLICK,
  status: CommissionStatus.PENDING,
  amount: 500,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useMyEarnings", () => {
  it("fetches the first page when authenticated", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    mswServer.use(
      http.get("/api/commissions/me", ({ request }) => {
        expect(new URL(request.url).searchParams.get("cursor")).toBeNull();
        return HttpResponse.json({
          success: true,
          message: "Earnings.",
          data: { items: [buildCommission("c1")], nextCursor: null },
        });
      }),
    );

    const { result } = renderHook(() => useMyEarnings(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.items).toHaveLength(1);
  });

  it("requests the next page using the cursor query param", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    mswServer.use(
      http.get("/api/commissions/me", ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        if (!cursor) {
          return HttpResponse.json({
            success: true,
            message: "Earnings.",
            data: { items: [buildCommission("c1")], nextCursor: "c1" },
          });
        }
        expect(cursor).toBe("c1");
        return HttpResponse.json({
          success: true,
          message: "Earnings.",
          data: { items: [buildCommission("c2")], nextCursor: null },
        });
      }),
    );

    const { result } = renderHook(() => useMyEarnings(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    void result.current.fetchNextPage();
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  });

  it("stays idle when unauthenticated", () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useMyEarnings(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
  });
});
