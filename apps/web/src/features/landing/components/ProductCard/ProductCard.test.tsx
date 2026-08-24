import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type ExploreProduct, ProductCard } from "./index";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock("@/features/wishlist", () => ({
  useToggleWishlist: () => ({ mutate: vi.fn() }),
}));

const buildProduct = (overrides: Partial<ExploreProduct> = {}): ExploreProduct => ({
  id: "product-1",
  brand: "Studio Nine",
  name: "Denim Jacket",
  price: 4500,
  creatorBuyerCount: 0,
  unitsSold: 0,
  ...overrides,
});

describe("ProductCard rating display", () => {
  it("shows a minimal star + average when the product has reviews", () => {
    render(<ProductCard product={buildProduct({ avgRating: 4.3, reviewCount: 12 })} />);

    expect(screen.getByText("4.3")).toBeInTheDocument();
  });

  it("omits the rating entirely for a product with no reviews yet", () => {
    render(<ProductCard product={buildProduct({ avgRating: null, reviewCount: 0 })} />);

    expect(screen.queryByText(/^\d\.\d$/)).not.toBeInTheDocument();
  });

  it("omits the rating when reviewCount/avgRating are not provided at all", () => {
    render(<ProductCard product={buildProduct()} />);

    expect(screen.queryByText(/^\d\.\d$/)).not.toBeInTheDocument();
  });
});
