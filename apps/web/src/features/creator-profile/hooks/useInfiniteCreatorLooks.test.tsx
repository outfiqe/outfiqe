import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { creatorProfileApi } from "../api/creatorProfileApi";
import { useInfiniteCreatorLooks } from "./useInfiniteCreatorLooks";

vi.mock("../api/creatorProfileApi", () => ({
  creatorProfileApi: { listLooks: vi.fn() },
}));

const LONG_STALE_TIME_MS = 5 * 60 * 1000;

const buildFreshQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: LONG_STALE_TIME_MS } },
  });

describe("useInfiniteCreatorLooks", () => {
  it("always revalidates on mount even when the cached grid still looks fresh by its staleTime", async () => {
    vi.mocked(creatorProfileApi.listLooks).mockResolvedValue({ posts: [], nextCursor: null });

    const queryClient = buildFreshQueryClient();
    queryClient.setQueryData(["creator-looks", "sabin", "anonymous"], {
      pages: [{ posts: [], nextCursor: null }],
      pageParams: [undefined],
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useInfiniteCreatorLooks("sabin"), { wrapper });

    await waitFor(() => expect(creatorProfileApi.listLooks).toHaveBeenCalled());
    expect(creatorProfileApi.listLooks).toHaveBeenCalledWith("sabin", undefined);
  });
});
