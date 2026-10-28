import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@test/integration/queryClientWrapper";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Cart, CartItem } from "../api/cartSchemas";
import { CART_QUERY_KEY } from "../constants/cart.constants";
import { useAddToCart } from "./useAddToCart";
import { useRemoveCartItem } from "./useRemoveCartItem";

const trackEvent = vi.fn();
const addItem = vi.fn();
const removeItem = vi.fn();

vi.mock("@/features/analytics/utils/analyticsClient", () => ({
  trackEvent: (...trackedEvent: unknown[]) => trackEvent(...trackedEvent),
}));

vi.mock("../api/cartApi", () => ({
  cartApi: {
    addItem: (...addition: unknown[]) => addItem(...addition),
    removeItem: (...removal: unknown[]) => removeItem(...removal),
  },
}));

const cartItem = (overrides: Partial<CartItem>): CartItem => ({
  id: "cart-item-1",
  productId: "product-1",
  sizeId: "size-m",
  productName: "Linen kurta",
  brandName: "Everlane",
  imageUrl: null,
  sizeLabel: "M",
  unitPrice: 2500,
  listUnitPrice: 2500,
  discountPercent: null,
  qty: 1,
  availableStock: 5,
  soldOut: false,
  lowStock: false,
  ...overrides,
});

const cartWith = (items: CartItem[]): Cart => ({
  items,
  itemCount: items.length,
  subtotal: 0,
  deliveryFee: 0,
  platformDiscountTotal: 0,
  total: 0,
  city: null,
  appliedCoupon: null,
});

const renderWithCart = <HookResult,>(useHook: () => HookResult, existingCart: Cart | null) => {
  const queryClient = createTestQueryClient();
  if (existingCart) queryClient.setQueryData(CART_QUERY_KEY, existingCart);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { ...renderHook(useHook, { wrapper: Wrapper }), queryClient };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("cart tracking", () => {
  it("records an added item with its price and the new cart size", async () => {
    addItem.mockResolvedValue(cartWith([cartItem({ qty: 2 })]));
    const { result } = renderWithCart(useAddToCart, null);

    await act(() =>
      result.current.mutateAsync({ productId: "product-1", sizeId: "size-m", qty: 2 }),
    );

    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.CART_ITEM_ADD, {
      product_id: "product-1",
      item_quantity: 2,
      product_price_npr: 2500,
      cart_item_count: 1,
    });
  });

  it("counts one when no quantity was given", async () => {
    addItem.mockResolvedValue(cartWith([cartItem({})]));
    const { result } = renderWithCart(useAddToCart, null);

    await act(() => result.current.mutateAsync({ productId: "product-1", sizeId: "size-m" }));

    expect(trackEvent).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.CART_ITEM_ADD,
      expect.objectContaining({ item_quantity: 1 }),
    );
  });

  it("records which product was removed, read from the cart before removal", async () => {
    removeItem.mockResolvedValue(cartWith([]));
    const { result, queryClient } = renderWithCart(
      useRemoveCartItem,
      cartWith([cartItem({ id: "cart-item-9", productId: "product-9" })]),
    );

    await act(() => result.current.mutateAsync("cart-item-9"));

    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.CART_ITEM_REMOVE, {
      product_id: "product-9",
      cart_item_count: 0,
    });
    expect(queryClient.getQueryData<Cart>(CART_QUERY_KEY)?.items).toEqual([]);
  });

  it("still records a removal when the cart wasn't loaded", async () => {
    removeItem.mockResolvedValue(cartWith([]));
    const { result } = renderWithCart(useRemoveCartItem, null);

    await act(() => result.current.mutateAsync("cart-item-9"));

    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.CART_ITEM_REMOVE, {
      product_id: null,
      cart_item_count: 0,
    });
  });
});
