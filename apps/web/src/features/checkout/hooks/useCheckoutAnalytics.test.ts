import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Cart } from "@/features/cart";

import { PaymentMethod } from "../api/checkoutSchemas";
import { useCheckoutAnalytics } from "./useCheckoutAnalytics";

const trackEvent = vi.fn();

vi.mock("@/features/analytics/utils/analyticsClient", () => ({
  trackEvent: (...trackedEvent: unknown[]) => trackEvent(...trackedEvent),
}));

const cart: Cart = {
  items: [],
  itemCount: 3,
  subtotal: 6000,
  deliveryFee: 150,
  platformDiscountTotal: 0,
  total: 6150,
  city: "Kathmandu",
  appliedCoupon: null,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useCheckoutAnalytics", () => {
  it("records the checkout start once, with the cart's value and size", () => {
    const { rerender } = renderHook(() =>
      useCheckoutAnalytics({ cart, isBuyNow: false, hasCoupon: false }),
    );
    rerender();

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.CHECKOUT_START, {
      cart_value_npr: 6150,
      cart_item_count: 3,
      is_buy_now: false,
    });
  });

  it("records the payment method a shopper picks", () => {
    const { result } = renderHook(() =>
      useCheckoutAnalytics({ cart, isBuyNow: false, hasCoupon: false }),
    );

    result.current.trackPaymentMethodSelect(PaymentMethod.KHALTI);

    expect(trackEvent).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.PAYMENT_METHOD_SELECT, {
      payment_method: "khalti",
    });
  });

  it("records the order submit with buy-now and coupon flags", () => {
    const { result } = renderHook(() =>
      useCheckoutAnalytics({ cart, isBuyNow: true, hasCoupon: true }),
    );

    result.current.trackOrderSubmit(PaymentMethod.COD);

    expect(trackEvent).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.ORDER_SUBMIT, {
      payment_method: "cod",
      is_buy_now: true,
      has_coupon: true,
    });
  });
});
