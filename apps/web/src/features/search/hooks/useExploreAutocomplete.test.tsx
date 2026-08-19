import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { exploreSearchApi } from "../api/exploreSearchApi";
import { useExploreAutocomplete } from "./useExploreAutocomplete";

vi.mock("../api/exploreSearchApi", () => ({
  exploreSearchApi: {
    autocompleteCreators: vi.fn(),
    autocompletePosts: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "QueryClientTestWrapper";

  return Wrapper;
};

describe("useExploreAutocomplete", () => {
  it("fires both creator and post autocomplete queries and combines their results", async () => {
    vi.mocked(exploreSearchApi.autocompleteCreators).mockResolvedValue([
      { userId: "u1", name: "Ava Martinez", handle: "ava", avatarUrl: null, followerCount: 10 },
    ]);
    vi.mocked(exploreSearchApi.autocompletePosts).mockResolvedValue([
      {
        id: "p1",
        imageUrl: "https://cdn.test/p1.jpg",
        caption: "Winter layers",
        creator: { name: "Ava Martinez", handle: "ava" },
      },
    ]);

    const { result } = renderHook(() => useExploreAutocomplete("ava", true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(exploreSearchApi.autocompleteCreators).toHaveBeenCalledWith("ava");
    expect(exploreSearchApi.autocompletePosts).toHaveBeenCalledWith("ava");
    expect(result.current.creators).toHaveLength(1);
    expect(result.current.posts).toHaveLength(1);
  });

  it("stays disabled and doesn't call either endpoint when enabled is false", () => {
    renderHook(() => useExploreAutocomplete("", false), { wrapper: createWrapper() });

    expect(exploreSearchApi.autocompleteCreators).not.toHaveBeenCalled();
    expect(exploreSearchApi.autocompletePosts).not.toHaveBeenCalled();
  });
});
