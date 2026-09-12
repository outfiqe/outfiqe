import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";

import type { PublicCollection } from "../api/collectionSchemas";
import { useInfiniteCollectionProducts } from "../hooks/useInfiniteCollectionProducts";
import { CollectionDetail } from "./CollectionDetail";

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/landing/components/ProductCard", () => ({
  ProductCard: ({ product }: { product: { name: string } }) => (
    <div data-testid="product-card">{product.name}</div>
  ),
}));

vi.mock("../hooks/useInfiniteCollectionProducts", () => ({
  useInfiniteCollectionProducts: vi.fn(),
}));

const COLLECTION: PublicCollection = {
  id: "col-1",
  name: "Autumn Edit",
  slug: "autumn-edit",
  description: null,
  imageUrl: null,
  image: null,
  productCount: 1,
};

const PRODUCT = {
  id: "prod-1",
  brand: "Studio Nine",
  name: "Everyday Tee",
  price: 1500,
  creatorBuyerCount: 0,
  unitsSold: 0,
};

const mockInfiniteCollectionProducts = (
  overrides: Partial<ReturnType<typeof useInfiniteCollectionProducts>>,
) => {
  vi.mocked(useInfiniteCollectionProducts).mockReturnValue({
    data: { pages: [{ products: [PRODUCT], nextCursor: null, total: 1 }] },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useInfiniteCollectionProducts>);
};

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: false,
    isAuthResolved: true,
  } as ReturnType<typeof useAuth>);

  mockInfiniteCollectionProducts({});
});

describe("CollectionDetail", () => {
  it("shows the loaded grid once products resolve", () => {
    render(<CollectionDetail collection={COLLECTION} />);

    expect(screen.getByText("Everyday Tee")).toBeInTheDocument();
    expect(useInfiniteCollectionProducts).toHaveBeenCalledWith("autumn-edit", true);
  });

  it("shows the loading skeleton instead of stale anonymous data while auth is still resolving", () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isAuthResolved: false,
    } as ReturnType<typeof useAuth>);

    render(<CollectionDetail collection={COLLECTION} />);

    expect(screen.getByRole("status", { name: "Loading products" })).toBeInTheDocument();
    expect(screen.queryByText("Everyday Tee")).not.toBeInTheDocument();
    expect(useInfiniteCollectionProducts).toHaveBeenCalledWith("autumn-edit", false);
  });

  it("shows an empty-collection message when there are no products yet", () => {
    mockInfiniteCollectionProducts({
      data: { pages: [{ products: [], nextCursor: null, total: 0 }], pageParams: [undefined] },
    });

    render(<CollectionDetail collection={COLLECTION} />);

    expect(screen.getByText("No products in this collection yet.")).toBeInTheDocument();
  });
});
