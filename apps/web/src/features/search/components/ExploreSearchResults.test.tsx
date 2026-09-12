import { render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";

import { useCreatorSearch, useLookSearch } from "../hooks/useExploreSearch";
import { ExploreSearchResults } from "./ExploreSearchResults";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/explore/components/PostGridCard", () => ({
  PostGridCard: ({ post }: { post: { id: string; caption: string | null } }) => (
    <div data-testid="post-grid-card">{post.caption}</div>
  ),
}));

vi.mock("@/features/explore/components/PostDetailModal", () => ({
  PostDetailModal: () => null,
}));

vi.mock("../hooks/useExploreSearch", () => ({
  useCreatorSearch: vi.fn(),
  useLookSearch: vi.fn(),
}));

const POST = {
  id: "post-1",
  creator: { id: "creator-1", name: "Ava", handle: "ava", isApproved: true },
  imageUrl: "https://cdn.outfiqe.test/post-1.jpg",
  images: ["https://cdn.outfiqe.test/post-1.jpg"],
  caption: "Everyday fit",
  likeCount: 0,
  commentCount: 0,
  saveCount: 0,
  isLiked: false,
  isSaved: false,
  isFollowingCreator: false,
  taggedProducts: [],
  hashtags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
};

const mockSearchParams = (params: Record<string, string>) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(params) as ReturnType<typeof useSearchParams>,
  );
};

const buildInfiniteQuerySuccessResult = <TData,>(data: TData) => ({
  data,
  dataUpdatedAt: 0,
  error: null,
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  errorUpdateCount: 0,
  isError: false as const,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isLoading: false as const,
  isPending: false as const,
  isLoadingError: false as const,
  isInitialLoading: false,
  isPaused: false,
  isPlaceholderData: false as const,
  isRefetchError: false as const,
  isRefetching: false,
  isStale: false,
  isSuccess: true as const,
  isEnabled: true,
  refetch: vi.fn(),
  status: "success" as const,
  fetchStatus: "idle" as const,
  promise: Promise.resolve(data),
  fetchNextPage: vi.fn(),
  fetchPreviousPage: vi.fn(),
  hasNextPage: false,
  hasPreviousPage: false,
  isFetchingNextPage: false,
  isFetchingPreviousPage: false,
  isFetchNextPageError: false as const,
  isFetchPreviousPageError: false as const,
});

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: false,
    isAuthResolved: true,
  } as ReturnType<typeof useAuth>);

  mockSearchParams({ q: "ava" });
  vi.mocked(useCreatorSearch).mockReturnValue(
    buildInfiniteQuerySuccessResult({
      pages: [{ creators: [], nextCursor: null, total: 0 }],
      pageParams: [undefined],
    }) as ReturnType<typeof useCreatorSearch>,
  );
  vi.mocked(useLookSearch).mockReturnValue(
    buildInfiniteQuerySuccessResult({
      pages: [{ posts: [POST], nextCursor: null, total: 1 }],
      pageParams: [undefined],
    }) as ReturnType<typeof useLookSearch>,
  );
});

describe("ExploreSearchResults", () => {
  it("shows matched posts once the search resolves", () => {
    render(<ExploreSearchResults />);

    expect(screen.getByText("Everyday fit")).toBeInTheDocument();
    expect(useCreatorSearch).toHaveBeenCalledWith("ava", true);
    expect(useLookSearch).toHaveBeenCalledWith("ava", true);
  });

  it("shows the loading state instead of stale anonymous data while auth is still resolving", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isAuthResolved: false,
    } as ReturnType<typeof useAuth>);

    render(<ExploreSearchResults />);

    expect(screen.queryByTestId("post-grid-card")).not.toBeInTheDocument();
    expect(useCreatorSearch).toHaveBeenCalledWith("ava", false);
    expect(useLookSearch).toHaveBeenCalledWith("ava", false);
  });
});
