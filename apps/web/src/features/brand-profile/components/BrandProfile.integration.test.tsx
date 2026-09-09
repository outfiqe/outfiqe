import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useChatPanel } from "@/features/messaging";
import { useProductTypes } from "@/features/products/hooks/useProductTypes";

import type { BrandProfile as BrandProfileType } from "../api/brandProfileSchemas";
import { useInfiniteBrandProducts } from "../hooks/useInfiniteBrandProducts";
import { BrandProfile } from "./BrandProfile";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/messaging", () => ({
  useChatPanel: vi.fn(),
}));

vi.mock("@/features/products/hooks/useProductTypes", () => ({
  useProductTypes: vi.fn(),
}));

vi.mock("../hooks/useInfiniteBrandProducts", () => ({
  useInfiniteBrandProducts: vi.fn(),
}));

vi.mock("@/components/FollowersModal", () => ({
  FollowersModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Followers">
      <button type="button" onClick={onClose}>
        Close followers
      </button>
    </div>
  ),
}));

vi.mock("@/features/landing/components/ProductCard", () => ({
  ProductCard: () => <div data-testid="product-card" />,
}));

const refresh = vi.fn();
const push = vi.fn();

const buildBrand = (overrides: Partial<BrandProfileType> = {}): BrandProfileType => ({
  id: "brand-1",
  name: "Studio One",
  avatarUrl: null,
  bannerUrl: null,
  madeInNepal: true,
  rating: null,
  productCount: 0,
  followerCount: 10,
  isFollowing: false,
  contactUserId: null,
  ...overrides,
});

const mockAuth = (isAuthenticated: boolean) => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated,
    state: { user: isAuthenticated ? { id: "viewer-1" } : null },
  } as ReturnType<typeof useAuth>);
};

const renderBrandProfile = (brand: BrandProfileType) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrap = (node: BrandProfileType) => (
    <QueryClientProvider client={queryClient}>
      <BrandProfile brand={node} />
    </QueryClientProvider>
  );
  const view = render(wrap(brand));
  return { ...view, rerenderWith: (next: BrandProfileType) => view.rerender(wrap(next)) };
};

beforeEach(() => {
  refresh.mockClear();
  push.mockClear();
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh,
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });
  mockAuth(true);
  vi.mocked(useChatPanel).mockReturnValue({
    isOpen: false,
    view: { kind: "list" },
    isStartingConversation: false,
    socket: null,
    openConversationWith: vi.fn(),
    openConversation: vi.fn(),
    openList: vi.fn(),
    close: vi.fn(),
  } as ReturnType<typeof useChatPanel>);
  vi.mocked(useProductTypes, { partial: true }).mockReturnValue({
    data: [],
    isLoading: false,
  });
  vi.mocked(useInfiniteBrandProducts, { partial: true }).mockReturnValue({
    data: undefined,
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  });
});

describe("BrandProfile follow toggle", () => {
  it("redirects an unauthenticated visitor to login instead of following", async () => {
    mockAuth(false);
    const user = userEvent.setup();
    renderBrandProfile(buildBrand());

    await user.click(screen.getByRole("button", { name: "Follow brand" }));

    expect(push).toHaveBeenCalledWith("/login?redirect=/brand/brand-1");
  });

  it("optimistically follows, then refreshes the server data once the request succeeds", async () => {
    mswServer.use(
      http.post("/api/follows/brand/brand-1", () =>
        HttpResponse.json({
          success: true,
          message: "Followed.",
          data: { following: true, followerCount: 11 },
        }),
      ),
    );

    const user = userEvent.setup();
    renderBrandProfile(buildBrand({ isFollowing: false, followerCount: 10 }));

    await user.click(screen.getByRole("button", { name: "Follow brand" }));

    expect(screen.getByRole("button", { name: "Following" })).toBeInTheDocument();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("rolls back the optimistic follow when the request fails", async () => {
    mswServer.use(
      http.post("/api/follows/brand/brand-1", () =>
        HttpResponse.json({ success: false, message: "Server error" }, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    renderBrandProfile(buildBrand({ isFollowing: false, followerCount: 10 }));

    await user.click(screen.getByRole("button", { name: "Follow brand" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Follow brand" })).toBeInTheDocument(),
    );
  });

  it("adopts a corrected server follow state when the profile props change", () => {
    const { rerenderWith } = renderBrandProfile(buildBrand({ isFollowing: false }));

    expect(screen.getByRole("button", { name: "Follow brand" })).toBeInTheDocument();

    rerenderWith(buildBrand({ isFollowing: true }));

    expect(screen.getByRole("button", { name: "Following" })).toBeInTheDocument();
  });
});
