"use client";

import { ANALYTICS_EVENTS, toAnalyticsPaymentMethod } from "@outfiqe/utils";

import { useTrackView } from "@/features/analytics/hooks/useTrackView";
import { trackEvent } from "@/features/analytics/utils/analyticsClient";
import type { Cart } from "@/features/cart";

import type { PaymentMethodValue } from "../api/checkoutSchemas";

type CheckoutAnalyticsInput = {
  cart: Cart;
  isBuyNow: boolean;
  hasCoupon: boolean;
};

const CHECKOUT_VIEW_KEY = "checkout";

export const useCheckoutAnalytics = ({ cart, isBuyNow, hasCoupon }: CheckoutAnalyticsInput) => {
  useTrackView(
    ANALYTICS_EVENTS.CHECKOUT_START,
    { cart_value_npr: cart.total, cart_item_count: cart.itemCount, is_buy_now: isBuyNow },
    CHECKOUT_VIEW_KEY,
  );

  const trackPaymentMethodSelect = (paymentMethod: PaymentMethodValue) => {
    const analyticsPaymentMethod = toAnalyticsPaymentMethod(paymentMethod);
    if (!analyticsPaymentMethod) return;
    trackEvent(ANALYTICS_EVENTS.PAYMENT_METHOD_SELECT, { payment_method: analyticsPaymentMethod });
  };

  const trackOrderSubmit = (paymentMethod: PaymentMethodValue) => {
    const analyticsPaymentMethod = toAnalyticsPaymentMethod(paymentMethod);
    if (!analyticsPaymentMethod) return;
    trackEvent(ANALYTICS_EVENTS.ORDER_SUBMIT, {
      payment_method: analyticsPaymentMethod,
      is_buy_now: isBuyNow,
      has_coupon: hasCoupon,
    });
  };

  return { trackPaymentMethodSelect, trackOrderSubmit };
};
