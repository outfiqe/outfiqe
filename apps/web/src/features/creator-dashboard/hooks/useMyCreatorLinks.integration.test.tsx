import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { CreatorLinkStatus, CreatorLinkType } from "../api/creatorLinksSchemas";
import { useMyCreatorLinks } from "./useMyCreatorLinks";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
}));

const buildLink = (id: string) => ({
  id,
  token: `token-${id}`,
  shareUrl: `https://outfiqe.test/r/${id}`,
  type: CreatorLinkType.EXTERNAL_REUSABLE,
  status: CreatorLinkStatus.ACTIVE,
  productId: null,
  productName: null,
  clickCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useMyCreatorLinks", () => {
  it("fetches the caller's links when authenticated", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    mswServer.use(
      http.get("/api/creator-links/mine", () =>
        HttpResponse.json({
          success: true,
          message: "Links.",
          data: { items: [buildLink("l1")], nextCursor: null },
        }),
      ),
    );

    const { result } = renderHook(() => useMyCreatorLinks(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.items).toHaveLength(1);
  });

  it("requests the next page using the cursor query param", async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAuth>);
    mswServer.use(
      http.get("/api/creator-links/mine", ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        if (!cursor) {
          return HttpResponse.json({
            success: true,
            message: "Links.",
            data: { items: [buildLink("l1")], nextCursor: "l1" },
          });
        }
        expect(cursor).toBe("l1");
        return HttpResponse.json({
          success: true,
          message: "Links.",
          data: { items: [buildLink("l2")], nextCursor: null },
        });
      }),
    );

    const { result } = renderHook(() => useMyCreatorLinks(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    void result.current.fetchNextPage();
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
  });

  it("stays idle when unauthenticated", () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useMyCreatorLinks(), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
  });
});
