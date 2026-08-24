import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import type { BrandSummary } from "../api/brandsSchemas";
import { useInfiniteBrands } from "../hooks/useInfiniteBrands";
import { BrandsGrid } from "./BrandsGrid";

vi.mock("../hooks/useInfiniteBrands", () => ({
  useInfiniteBrands: vi.fn(),
}));

vi.mock("@/shared/hooks/useLoadMoreOnVisible", () => ({
  useLoadMoreOnVisible: vi.fn(),
}));

vi.mock("./BrandCard", () => ({
  BrandCard: ({ brand }: { brand: BrandSummary }) => (
    <div data-testid="brand-card">{brand.name}</div>
  ),
}));

const buildBrand = (id: string): BrandSummary => ({
  id,
  name: `Brand ${id}`,
  avatarUrl: null,
  bannerUrl: null,
  madeInNepal: true,
  rating: null,
  productCount: 1,
  followerCount: 1,
  isFollowing: false,
  contactUserId: null,
});

const mockInfiniteBrands = (overrides: Partial<ReturnType<typeof useInfiniteBrands>>) => {
  vi.mocked(useInfiniteBrands).mockReturnValue({
    data: undefined,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useInfiniteBrands>);
};

beforeEach(() => {
  vi.mocked(useLoadMoreOnVisible).mockReturnValue(createRef<HTMLDivElement>());
});

describe("BrandsGrid", () => {
  it("shows the loading skeleton while the first page is loading", () => {
    mockInfiniteBrands({ isLoading: true });

    render(<BrandsGrid />);

    expect(screen.getByRole("status", { name: "Loading brands" })).toBeInTheDocument();
  });

  it("shows an error message when the request fails", () => {
    mockInfiniteBrands({ isError: true });

    render(<BrandsGrid />);

    expect(screen.getByText("Couldn't load brands.")).toBeInTheDocument();
  });

  it("shows an empty state when there are no brands", () => {
    mockInfiniteBrands({
      data: { pages: [{ brands: [], nextCursor: null, total: 0 }], pageParams: [undefined] },
    });

    render(<BrandsGrid />);

    expect(screen.getByText("No brands yet.")).toBeInTheDocument();
  });

  it("renders a card for every brand across all fetched pages", () => {
    mockInfiniteBrands({
      data: {
        pages: [
          { brands: [buildBrand("b1"), buildBrand("b2")], nextCursor: "b2", total: 3 },
          { brands: [buildBrand("b3")], nextCursor: null, total: 3 },
        ],
        pageParams: [undefined, "b2"],
      },
    });

    render(<BrandsGrid />);

    const cards = screen.getAllByTestId("brand-card");
    expect(cards.map((card) => card.textContent)).toEqual(["Brand b1", "Brand b2", "Brand b3"]);
  });

  it("shows a loading-more indicator while fetching the next page", () => {
    mockInfiniteBrands({
      data: {
        pages: [{ brands: [buildBrand("b1")], nextCursor: "b1", total: 2 }],
        pageParams: [undefined],
      },
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    render(<BrandsGrid />);

    expect(screen.getByText("Loading more…")).toBeInTheDocument();
  });

  it("enables the load-more sentinel only when there's a next page and nothing in flight", () => {
    mockInfiniteBrands({
      data: {
        pages: [{ brands: [buildBrand("b1")], nextCursor: "b1", total: 2 }],
        pageParams: [undefined],
      },
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    render(<BrandsGrid />);

    expect(vi.mocked(useLoadMoreOnVisible)).toHaveBeenCalledWith(expect.any(Function), true);
  });

  it("omits the sentinel entirely once there are no more pages", () => {
    mockInfiniteBrands({
      data: {
        pages: [{ brands: [buildBrand("b1")], nextCursor: null, total: 1 }],
        pageParams: [undefined],
      },
      hasNextPage: false,
    });

    render(<BrandsGrid />);

    expect(screen.queryByText("Loading more…")).not.toBeInTheDocument();
  });
});
