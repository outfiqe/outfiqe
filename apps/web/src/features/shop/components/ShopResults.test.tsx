import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCategories } from "@/features/categories/hooks/useCategories";
import { useInfiniteProducts } from "@/features/products/hooks/useInfiniteProducts";
import { useProductTypes } from "@/features/products/hooks/useProductTypes";

import { ShopResults } from "./ShopResults";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: () => "/shop",
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("@/features/wishlist", () => ({
  useToggleWishlist: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/features/categories/hooks/useCategories", () => ({
  useCategories: vi.fn(),
}));

vi.mock("@/features/products/hooks/useInfiniteProducts", () => ({
  useInfiniteProducts: vi.fn(),
}));

vi.mock("@/features/products/hooks/useProductTypes", () => ({
  useProductTypes: vi.fn(),
}));

const CATEGORIES = [{ id: "cat-tops", slug: "tops", name: "Tops", imageUrl: null }];

const PRODUCT = {
  id: "prod-1",
  brand: "Studio Nine",
  name: "Everyday Tee",
  price: 1500,
  creatorBuyerCount: 0,
  unitsSold: 0,
};

const replace = vi.fn();
const push = vi.fn();

const mockSearchParams = (params: Record<string, string>) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(params) as ReturnType<typeof useSearchParams>,
  );
};

const mockInfiniteProducts = (overrides: Partial<ReturnType<typeof useInfiniteProducts>>) => {
  vi.mocked(useInfiniteProducts).mockReturnValue({
    data: { pages: [{ products: [PRODUCT], nextCursor: null, total: 1, brandCount: 1 }] },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useInfiniteProducts>);
};

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });
  replace.mockClear();
  push.mockClear();

  vi.mocked(useCategories).mockReturnValue({
    data: CATEGORIES,
    isLoading: false,
  } as ReturnType<typeof useCategories>);

  vi.mocked(useProductTypes).mockReturnValue({
    data: [{ id: "pt-shirts", slug: "shirts", label: "Shirts" }],
    isLoading: false,
  } as ReturnType<typeof useProductTypes>);

  mockSearchParams({ category: "tops" });
  mockInfiniteProducts({});
});

describe("ShopResults", () => {
  it("shows the loaded grid once products resolve", () => {
    render(<ShopResults />);

    expect(screen.getByText("Everyday Tee")).toBeInTheDocument();
  });

  it("shows the loading skeleton immediately when a type filter selection is pending", async () => {
    const user = userEvent.setup();
    render(<ShopResults />);

    await user.click(screen.getByRole("button", { name: "Shirts" }));

    expect(screen.getByRole("status", { name: "Loading products" })).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/shop?category=tops&type=shirts", { scroll: false });
  });

  it("shows the loading skeleton while a requested category is still being resolved", () => {
    vi.mocked(useCategories).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useCategories>);

    render(<ShopResults />);

    expect(screen.getByRole("status", { name: "Loading products" })).toBeInTheDocument();
  });

  it("shows an empty-shop message when no category filter is requested and there is nothing to sell", () => {
    mockSearchParams({});
    mockInfiniteProducts({
      data: {
        pages: [{ products: [], nextCursor: null, total: 0, brandCount: 0 }],
        pageParams: [undefined],
      },
    });

    render(<ShopResults />);

    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shirts" })).not.toBeInTheDocument();
  });
});
