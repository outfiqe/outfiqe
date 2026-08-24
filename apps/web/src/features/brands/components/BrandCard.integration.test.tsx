import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";

import type { BrandSummary } from "../api/brandsSchemas";
import { BrandCard } from "./BrandCard";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const push = vi.fn();

const mockAuth = (isAuthenticated: boolean) => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated,
  } as ReturnType<typeof useAuth>);
};

const buildBrand = (overrides: Partial<BrandSummary> = {}): BrandSummary => ({
  id: "brand-9",
  name: "Studio Nine",
  avatarUrl: null,
  bannerUrl: null,
  madeInNepal: true,
  rating: null,
  productCount: 4,
  followerCount: 10,
  isFollowing: false,
  contactUserId: null,
  ...overrides,
});

const renderCard = (brand: BrandSummary) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrandCard brand={brand} />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });
  push.mockClear();
  mockAuth(true);
});

describe("BrandCard", () => {
  it("renders the brand's name and the Made in Nepal badge when applicable", () => {
    renderCard(buildBrand({ madeInNepal: true }));

    expect(screen.getAllByText("Studio Nine").length).toBeGreaterThan(0);
    expect(screen.getByText("Made in Nepal")).toBeInTheDocument();
  });

  it("hides the Made in Nepal badge when the brand isn't made in Nepal", () => {
    renderCard(buildBrand({ madeInNepal: false }));

    expect(screen.queryByText("Made in Nepal")).not.toBeInTheDocument();
  });

  it("uses singular product/follower labels when the count is exactly one", () => {
    renderCard(buildBrand({ productCount: 1, followerCount: 1 }));

    expect(screen.getByText("product")).toBeInTheDocument();
    expect(screen.getByText("follower")).toBeInTheDocument();
  });

  it("uses plural product/follower labels otherwise", () => {
    renderCard(buildBrand({ productCount: 0, followerCount: 2 }));

    expect(screen.getByText("products")).toBeInTheDocument();
    expect(screen.getByText("followers")).toBeInTheDocument();
  });
});

describe("BrandCard follow toggle", () => {
  it("redirects an unauthenticated visitor to login instead of following", async () => {
    mockAuth(false);
    const user = userEvent.setup();
    renderCard(buildBrand());

    await user.click(screen.getByRole("button", { name: "Follow" }));

    expect(push).toHaveBeenCalledWith("/login?redirect=/brands");
  });

  it("optimistically follows, then confirms once the request succeeds", async () => {
    mswServer.use(
      http.post("/api/follows/brand/brand-9", () =>
        HttpResponse.json({
          success: true,
          message: "Followed.",
          data: { following: true, followerCount: 11 },
        }),
      ),
    );

    const user = userEvent.setup();
    renderCard(buildBrand({ isFollowing: false, followerCount: 10 }));

    await user.click(screen.getByRole("button", { name: "Follow" }));

    expect(screen.getByRole("button", { name: "Following" })).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Following" })).toBeInTheDocument(),
    );
  });

  it("optimistically unfollows, then confirms once the request succeeds", async () => {
    mswServer.use(
      http.delete("/api/follows/brand/brand-9", () =>
        HttpResponse.json({
          success: true,
          message: "Unfollowed.",
          data: { following: false, followerCount: 9 },
        }),
      ),
    );

    const user = userEvent.setup();
    renderCard(buildBrand({ isFollowing: true, followerCount: 10 }));

    await user.click(screen.getByRole("button", { name: "Following" }));

    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("rolls back the optimistic follow when the request fails", async () => {
    mswServer.use(
      http.post("/api/follows/brand/brand-9", () =>
        HttpResponse.json({ success: false, message: "Server error" }, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    renderCard(buildBrand({ isFollowing: false, followerCount: 10 }));

    await user.click(screen.getByRole("button", { name: "Follow" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument());
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});
