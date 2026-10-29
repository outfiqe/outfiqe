import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Cart, CartItem } from "../api/cartSchemas";
import { CartSummary } from "./CartSummary";

vi.mock("./CouponForm", () => ({ CouponForm: () => null }));

const buildCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: "cart-item-1",
  productId: "product-1",
  sizeId: "size-1",
  productName: "Linen shirt",
  brandName: "Test Brand",
  imageUrl: null,
  sizeLabel: "M",
  unitPrice: 1000,
  listUnitPrice: 1000,
  discountPercent: null,
  qty: 1,
  availableStock: 5,
  soldOut: false,
  unavailable: false,
  lowStock: false,
  ...overrides,
});

const buildCart = (items: CartItem[]): Cart => ({
  items,
  itemCount: items.length,
  subtotal: 1000,
  deliveryFee: 0,
  platformDiscountTotal: 0,
  total: 1000,
  city: null,
  appliedCoupon: null,
});

describe("CartSummary", () => {
  it("links to checkout when every item can be bought", () => {
    render(<CartSummary cart={buildCart([buildCartItem()])} />);

    expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");
  });

  it("disables checkout and explains why while an unavailable item is in the bag", () => {
    const unavailableItem = buildCartItem({ id: "cart-item-2", soldOut: true, unavailable: true });
    render(<CartSummary cart={buildCart([buildCartItem(), unavailableItem])} />);

    expect(screen.queryByRole("link", { name: "Checkout" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Checkout" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/remove the unavailable items/i);
  });
});
