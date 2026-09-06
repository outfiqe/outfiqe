import type { Cart } from "@/features/cart";
import type { DeliveryZone } from "@/features/delivery-zones";

import type { BuyNowCouponPreview } from "../api/checkoutApi";
import type { BuyNowPayload } from "./buyNowStorage";

export const buildBuyNowCart = (
  payload: BuyNowPayload,
  zone: DeliveryZone | undefined,
  appliedCoupon: BuyNowCouponPreview | null = null,
): Cart => {
  const subtotal = payload.unitPrice * payload.qty;
  const deliveryFee = zone && subtotal < zone.freeDeliveryThreshold ? zone.standardDeliveryFee : 0;
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
    deliveryFee,
    platformDiscountTotal,
    total: subtotal - platformDiscountTotal + deliveryFee,
    city: null,
    appliedCoupon,
  };
};
