import { describe, expect, it } from "vitest";

import type { DeliveryZone } from "@/features/delivery-zones";

import { buildBuyNowCart } from "./buildBuyNowCart";
import type { BuyNowPayload } from "./buyNowStorage";

const PAYLOAD: BuyNowPayload = {
  productId: "product-1",
  sizeId: "size-1",
  qty: 1,
  productName: "Jacket",
  brandName: "Test Brand",
  imageUrl: null,
  sizeLabel: "M",
  unitPrice: 2_000,
};

const ZONE = { standardDeliveryFee: 100, freeDeliveryThreshold: 100_000 } as DeliveryZone;

describe("buildBuyNowCart", () => {
  it("has no discount when no coupon is applied", () => {
    const cart = buildBuyNowCart(PAYLOAD, ZONE);

    expect(cart.platformDiscountTotal).toBe(0);
    expect(cart.appliedCoupon).toBeNull();
    expect(cart.total).toBe(2_000 + 100);
  });

  it("subtracts the coupon's discount from the total", () => {
    const cart = buildBuyNowCart(PAYLOAD, ZONE, {
      code: "WELCOME300",
      discountAmount: 300,
      prepaidOnly: false,
    });

    expect(cart.platformDiscountTotal).toBe(300);
    expect(cart.appliedCoupon?.code).toBe("WELCOME300");
    expect(cart.total).toBe(2_000 - 300 + 100);
  });

  it("computes the free-delivery threshold against the pre-coupon subtotal", () => {
    const bigTicketZone = {
      standardDeliveryFee: 100,
      freeDeliveryThreshold: 1_900,
    } as DeliveryZone;
    const cart = buildBuyNowCart(PAYLOAD, bigTicketZone, {
      code: "WELCOME300",
      discountAmount: 300,
      prepaidOnly: false,
    });

    expect(cart.deliveryFee).toBe(0);
    expect(cart.total).toBe(2_000 - 300);
  });
});
