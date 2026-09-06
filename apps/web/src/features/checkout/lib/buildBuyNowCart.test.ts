import { describe, expect, it } from "vitest";

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

describe("buildBuyNowCart", () => {
  it("has no discount when no coupon is applied", () => {
    const cart = buildBuyNowCart(PAYLOAD);

    expect(cart.subtotal).toBe(2_000);
    expect(cart.platformDiscountTotal).toBe(0);
    expect(cart.appliedCoupon).toBeNull();
    expect(cart.total).toBe(2_000);
  });

  it("subtracts the coupon's discount from the total", () => {
    const cart = buildBuyNowCart(PAYLOAD, {
      code: "WELCOME300",
      discountAmount: 300,
      prepaidOnly: false,
    });

    expect(cart.platformDiscountTotal).toBe(300);
    expect(cart.appliedCoupon?.code).toBe("WELCOME300");
    expect(cart.total).toBe(2_000 - 300);
  });

  it("scales the subtotal with quantity", () => {
    const cart = buildBuyNowCart({ ...PAYLOAD, qty: 3 });

    expect(cart.subtotal).toBe(6_000);
    expect(cart.itemCount).toBe(3);
  });
});
