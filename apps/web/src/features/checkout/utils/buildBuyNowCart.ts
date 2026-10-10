import type { Cart } from "@/features/cart";

import type { BuyNowCouponPreview } from "../api/checkoutApi";
import type { BuyNowPayload } from "./buyNowStorage";

export const buildBuyNowCart = (
  payload: BuyNowPayload,
  appliedCoupon: BuyNowCouponPreview | null = null,
): Cart => {
  const subtotal = payload.unitPrice * payload.qty;
  const platformDiscountTotal = appliedCoupon?.discountAmount ?? 0;

  return {
    items: [
      {
        id: `buy-now-${payload.sizeId}`,
        productId: payload.productId,
        sizeId: payload.sizeId,
        productName: payload.productName,
        brandName: payload.brandName,
        imageUrl: payload.imageUrl,
        sizeLabel: payload.sizeLabel,
        unitPrice: payload.unitPrice,
        listUnitPrice: payload.unitPrice,
        discountPercent: null,
        qty: payload.qty,
        availableStock: payload.qty,
        soldOut: false,
        lowStock: false,
      },
    ],
    itemCount: payload.qty,
    subtotal,
    deliveryFee: 0,
    platformDiscountTotal,
    total: subtotal - platformDiscountTotal,
    city: null,
    appliedCoupon,
  };
};
