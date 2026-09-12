import { render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useInfiniteProducts } from "@/features/products/hooks/useInfiniteProducts";

import { SearchResults } from "./SearchResults";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/landing/components/ProductCard", () => ({
  ProductCard: ({ product }: { product: { name: string } }) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));

vi.mock("@/features/products/hooks/useInfiniteProducts", () => ({
  useInfiniteProducts: vi.fn(),
}));

const PRODUCT = {
  id: "prod-1",
  brand: "Studio Nine",
  name: "Everyday Tee",
  price: 1500,
  creatorBuyerCount: 0,
  unitsSold: 0,
};

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
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: false,
    isAuthResolved: true,
  } as ReturnType<typeof useAuth>);

  mockSearchParams({ q: "tee" });
  mockInfiniteProducts({});
});

describe("SearchResults", () => {
  it("shows the loaded grid once products resolve", () => {
    render(<SearchResults />);

    expect(screen.getByText("Everyday Tee")).toBeInTheDocument();
  });

  it("prompts for a query instead of fetching when none was typed", () => {
    mockSearchParams({});

    render(<SearchResults />);

    expect(screen.getByText("Search for a product, brand, or category.")).toBeInTheDocument();
    expect(useInfiniteProducts).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it("shows the loading skeleton instead of stale anonymous data while auth is still resolving", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isAuthResolved: false,
    } as ReturnType<typeof useAuth>);

    render(<SearchResults />);

    expect(screen.getByRole("status", { name: "Loading products" })).toBeInTheDocument();
    expect(screen.queryByText("Everyday Tee")).not.toBeInTheDocument();
    expect(useInfiniteProducts).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it("shows a no-results message when the search comes back empty", () => {
    mockInfiniteProducts({
      data: {
        pages: [{ products: [], nextCursor: null, total: 0, brandCount: 0 }],
        pageParams: [undefined],
      },
    });

    render(<SearchResults />);

    expect(screen.getByText("No pieces matched. Try a different search.")).toBeInTheDocument();
  });
});
