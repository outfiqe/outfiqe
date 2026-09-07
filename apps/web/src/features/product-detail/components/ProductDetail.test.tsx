import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductDetail as ProductDetailType } from "../api/productDetailSchemas";
import { ProductDetail } from "./ProductDetail";

const addToCart = vi.fn();

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("@/features/cart", () => ({
  useAddToCart: () => ({ mutate: addToCart, isPending: false }),
}));

vi.mock("@/features/wishlist", () => ({
  useToggleWishlist: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/features/checkout", () => ({
  saveBuyNowPayload: vi.fn(),
}));

vi.mock("@/features/product-reviews", () => ({
  ReviewsSection: () => null,
}));

vi.mock("./SeenOnCreators", () => ({
  SeenOnCreators: () => null,
}));

vi.mock("./ShippingInfo", () => ({
  ShippingInfo: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

const buildProduct = (
  sizes: ProductDetailType["sizes"],
  overrides: Partial<ProductDetailType> = {},
): ProductDetailType => ({
  id: "product-1",
  brand: { id: "brand-1", name: "Kastha" },
  name: "Wool Bomber",
  price: 5400,
  effectivePrice: 5400,
  discountPercent: null,
  type: "outerwear",
  categorySlugs: ["streetwear"],
  imageUrl: null,
  lowStock: false,
  isNew: false,
  sizes,
  images: [],
  wornByCount: 0,
  seenOnCreators: [],
  isSaved: false,
  avgRating: null,
  reviewCount: 0,
  rating1Count: 0,
  rating2Count: 0,
  rating3Count: 0,
  rating4Count: 0,
  rating5Count: 0,
  ...overrides,
});

const cta = (name: RegExp) => screen.getByRole("button", { name });

describe("ProductDetail out-of-stock handling", () => {
  beforeEach(() => {
    addToCart.mockClear();
  });

  it("shows Out of stock and disables the CTAs when every size is sold out", () => {
    render(
      <ProductDetail
        product={buildProduct([
          { id: "s", label: "S", inStock: false },
          { id: "m", label: "M", inStock: false },
        ])}
      />,
    );

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.queryByText("Select a size to continue.")).not.toBeInTheDocument();
    expect(cta(/add to cart/i)).toBeDisabled();
    expect(cta(/buy now/i)).toBeDisabled();
  });

  it("shows Out of stock when the only size is sold out", () => {
    render(
      <ProductDetail product={buildProduct([{ id: "one", label: "One size", inStock: false }])} />,
    );

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(cta(/add to cart/i)).toBeDisabled();
  });

  it("auto-selects the first available size and enables the CTAs", () => {
    render(
      <ProductDetail
        product={buildProduct([
          { id: "s", label: "S", inStock: false },
          { id: "m", label: "M", inStock: true },
        ])}
      />,
    );

    expect(screen.queryByText("Out of stock")).not.toBeInTheDocument();
    expect(screen.queryByText("Select a size to continue.")).not.toBeInTheDocument();
    expect(cta(/add to cart/i)).toBeEnabled();

    cta(/add to cart/i).click();
    expect(addToCart).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "product-1", sizeId: "m", qty: 1 }),
      expect.anything(),
    );
  });
});
