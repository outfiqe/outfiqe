import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { useInfiniteExploreFeed } from "./useInfiniteExploreFeed";

vi.mock("../api/exploreFeedApi", () => ({
  exploreFeedApi: { list: vi.fn() },
}));

const LONG_STALE_TIME_MS = 5 * 60 * 1000;

const buildFreshQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: LONG_STALE_TIME_MS } },
  });

describe("useInfiniteExploreFeed", () => {
  it("always revalidates on mount even when the cached page still looks fresh by its staleTime", async () => {
    vi.mocked(exploreFeedApi.list).mockResolvedValue({ posts: [], nextCursor: null });

    const queryClient = buildFreshQueryClient();
    queryClient.setQueryData(["explore-feed", "for-you"], {
      pages: [{ posts: [], nextCursor: null }],
      pageParams: [undefined],
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useInfiniteExploreFeed("for-you"), { wrapper });

    await waitFor(() => expect(exploreFeedApi.list).toHaveBeenCalled());
    expect(exploreFeedApi.list).toHaveBeenCalledWith({ tab: "for-you", cursor: undefined });
  });

  it("also forces a real refetch on reconnect, not just on mount", async () => {
    vi.mocked(exploreFeedApi.list).mockResolvedValue({ posts: [], nextCursor: null });

    const queryClient = buildFreshQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useInfiniteExploreFeed("for-you"), { wrapper });

    await waitFor(() => expect(exploreFeedApi.list).toHaveBeenCalled());
    const query = queryClient.getQueryCache().find({ queryKey: ["explore-feed", "for-you"] });
    const options = query?.options as { refetchOnReconnect?: unknown } | undefined;
    expect(options?.refetchOnReconnect).toBe("always");
  });
});
