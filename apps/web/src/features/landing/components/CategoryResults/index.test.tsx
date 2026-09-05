import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter, useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCategories } from "@/features/categories/hooks/useCategories";
import { useInfiniteProducts } from "@/features/products/hooks/useInfiniteProducts";
import { useProductTypes } from "@/features/products/hooks/useProductTypes";

import {
  CategorySelectionProvider,
  useCategorySelection,
} from "../../lib/CategorySelectionContext";
import { CategoryResults } from "./index";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: () => "/",
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

const CATEGORIES = [
  { id: "cat-tops", slug: "tops", name: "Tops", imageUrl: null },
  { id: "cat-dresses", slug: "dresses", name: "Dresses", imageUrl: null },
];

const buildQuerySuccessResult = <TData,>(data: TData) => ({
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
});

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

const TriggerPendingCategory = ({ slug }: { slug: string }) => {
  const { markCategoryPending } = useCategorySelection();
  return (
    <button type="button" onClick={() => markCategoryPending(slug)}>
      trigger-pending-category
    </button>
  );
};

const renderCategoryResults = () =>
  render(
    <CategorySelectionProvider>
      <TriggerPendingCategory slug="dresses" />
      <CategoryResults />
    </CategorySelectionProvider>,
  );

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
    data: [] as { id: string; slug: string; label: string }[],
    isLoading: false,
  } as ReturnType<typeof useProductTypes>);

  mockSearchParams({ category: "tops" });
  mockInfiniteProducts({});
});

describe("CategoryResults", () => {
  it("shows the loaded grid once products resolve", () => {
    renderCategoryResults();

    expect(screen.getByText("Everyday Tee")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading products" })).not.toBeInTheDocument();
  });

  it("shows the loading skeleton immediately when a category selection is pending, even though the product query itself isn't loading", async () => {
    const user = userEvent.setup();
    renderCategoryResults();

    await user.click(screen.getByText("trigger-pending-category"));

    expect(screen.getByRole("status", { name: "Loading products" })).toBeInTheDocument();
    expect(screen.queryByText("Everyday Tee")).not.toBeInTheDocument();
  });

  it("shows the loading skeleton immediately when a type filter selection is pending", async () => {
    const user = userEvent.setup();
    vi.mocked(useProductTypes).mockReturnValue({
      data: [{ id: "pt-shirts", slug: "shirts", label: "Shirts" }],
      isLoading: false,
    } as ReturnType<typeof useProductTypes>);

    renderCategoryResults();
    await user.click(screen.getByRole("button", { name: "Shirts" }));

    expect(screen.getByRole("status", { name: "Loading products" })).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/?category=tops&type=shirts", { scroll: false });
  });

  it("shows the loading skeleton while the categories list itself is still loading", () => {
    vi.mocked(useCategories).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useCategories>);

    renderCategoryResults();

    expect(screen.getByRole("status", { name: "Loading products" })).toBeInTheDocument();
  });

  it("renders nothing when there is no category to show", () => {
    vi.mocked(useCategories).mockReturnValue(
      buildQuerySuccessResult([]) as ReturnType<typeof useCategories>,
    );

    const { container } = renderCategoryResults();

    expect(container.querySelector("section")).not.toBeInTheDocument();
  });

  it("sends the shopper to /shop with the current category and type when View all is clicked", async () => {
    const user = userEvent.setup();
    mockSearchParams({ category: "tops", type: "shirts" });

    renderCategoryResults();
    await user.click(screen.getByRole("button", { name: /View all/ }));

    expect(push).toHaveBeenCalledWith("/shop?category=tops&type=shirts");
  });
});
