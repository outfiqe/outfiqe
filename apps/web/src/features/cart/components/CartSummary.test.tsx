import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as DeliveryZonesFeature from "@/features/delivery-zones";
import type { DeliveryZone } from "@/features/delivery-zones";

import type { Cart, CartItem } from "../api/cartSchemas";
import { CartSummary } from "./CartSummary";

vi.mock("./CouponForm", () => ({ CouponForm: () => null }));

const mocks = vi.hoisted(() => ({ deliveryZones: undefined as unknown }));

vi.mock("@/features/delivery-zones", async (importOriginal) => ({
  ...(await importOriginal<typeof DeliveryZonesFeature>()),
  useDeliveryZones: () => ({ data: mocks.deliveryZones }),
}));

const buildZone = (overrides: Partial<DeliveryZone>): DeliveryZone => ({
  id: "zone-default",
  name: "Everywhere else",
  isDefault: true,
  cities: [],
  standardDeliveryFee: 150,
  freeDeliveryThreshold: 5000,
  codHandlingFee: 50,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

beforeEach(() => {
  mocks.deliveryZones = [
    buildZone({}),
    buildZone({ id: "zone-valley", isDefault: false, standardDeliveryFee: 100 }),
  ];
});

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

  it("quotes the lowest delivery fee and keeps it out of the total while no city is chosen", () => {
    const bagWithoutCity: Cart = { ...buildCart([buildCartItem()]), deliveryFee: 150, total: 1150 };
    render(<CartSummary cart={bagWithoutCity} />);

    expect(screen.getByText("From Rs. 100")).toBeInTheDocument();
    expect(screen.getByText(/add your city above/i)).toBeInTheDocument();
    expect(screen.getByText("Total before delivery")).toBeInTheDocument();
    expect(screen.getAllByText("Rs. 1,000")).toHaveLength(2);
    expect(screen.queryByText("Rs. 1,150")).not.toBeInTheDocument();
  });

  it("says the fee is added once a city is chosen when the zones have not loaded", () => {
    mocks.deliveryZones = undefined;
    render(<CartSummary cart={buildCart([buildCartItem()])} />);

    expect(screen.getByText("Added once you choose a city")).toBeInTheDocument();
  });

  it("shows the exact delivery fee and the full total once a city is chosen", () => {
    const bagWithCity: Cart = {
      ...buildCart([buildCartItem()]),
      city: "Kathmandu",
      deliveryFee: 100,
      total: 1100,
    };
    render(<CartSummary cart={bagWithCity} />);

    expect(screen.getByText("Delivery to Kathmandu")).toBeInTheDocument();
    expect(screen.getByText("Rs. 100")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1,100")).toBeInTheDocument();
    expect(screen.queryByText(/add your city above/i)).not.toBeInTheDocument();
  });
});
