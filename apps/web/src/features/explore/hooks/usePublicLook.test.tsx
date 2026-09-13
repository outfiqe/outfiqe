import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { exploreFeedApi } from "../api/exploreFeedApi";
import { usePublicLook } from "./usePublicLook";

vi.mock("../api/exploreFeedApi", () => ({
  exploreFeedApi: { getById: vi.fn() },
}));

const LONG_STALE_TIME_MS = 5 * 60 * 1000;

const buildFreshQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: LONG_STALE_TIME_MS } },
  });

beforeEach(() => {
  vi.mocked(exploreFeedApi.getById).mockClear();
});

describe("usePublicLook", () => {
  it("always revalidates on mount even when the cached look still looks fresh by its staleTime", async () => {
    const post = {
      id: "look-1",
      isLiked: false,
      isSaved: false,
      creator: { id: "c1" },
    };
    vi.mocked(exploreFeedApi.getById).mockResolvedValue(post as never);

    const queryClient = buildFreshQueryClient();
    queryClient.setQueryData(["creator-looks", "public", "look-1", "anonymous"], post);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => usePublicLook("look-1"), { wrapper });

    await waitFor(() => expect(exploreFeedApi.getById).toHaveBeenCalled());
    expect(exploreFeedApi.getById).toHaveBeenCalledWith("look-1");
  });

  it("waits for auth to resolve before fetching, so the request is never sent anonymously", async () => {
    vi.mocked(exploreFeedApi.getById).mockResolvedValue({
      id: "look-1",
      isLiked: false,
      isSaved: false,
      creator: { id: "c1" },
    } as never);

    const queryClient = buildFreshQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => usePublicLook("look-1", false), { wrapper });

    expect(exploreFeedApi.getById).not.toHaveBeenCalled();
  });
});
