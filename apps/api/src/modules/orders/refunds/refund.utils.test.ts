import { describe, expect, it } from "vitest";

import { couponBudgetReleaseTarget, resizeBrandPayout } from "./refund.utils.js";

describe("resizeBrandPayout", () => {
  it("shrinks the gross, Outfiqe's fee and the brand's share by the units kept", () => {
    expect(
      resizeBrandPayout({
        unitPrice: 1000,
        qty: 3,
        keptQtyBefore: 3,
        keptQtyAfter: 2,
        fullLinePlatformFee: 105,
        currentGatewayFee: 60,
      }),
    ).toEqual({ grossAmount: 2000, platformFee: 70, gatewayFee: 40, netAmount: 1930 });
  });

  it("works the fee out from the full line every time, so repeated refunds don't drift", () => {
    const afterSecondRefund = resizeBrandPayout({
      unitPrice: 200,
      qty: 3,
      keptQtyBefore: 2,
      keptQtyAfter: 1,
      fullLinePlatformFee: 30,
      currentGatewayFee: 8,
    });

    expect(afterSecondRefund).toEqual({
      grossAmount: 200,
      platformFee: 10,
      gatewayFee: 4,
      netAmount: 190,
    });
  });

  it("drops everything to zero when nothing is kept", () => {
    expect(
      resizeBrandPayout({
        unitPrice: 500,
        qty: 2,
        keptQtyBefore: 0,
        keptQtyAfter: 0,
        fullLinePlatformFee: 30,
        currentGatewayFee: 0,
      }),
    ).toEqual({ grossAmount: 0, platformFee: 0, gatewayFee: 0, netAmount: 0 });
  });
});

describe("couponBudgetReleaseTarget", () => {
  it("releases the platform-funded part in proportion to the coupon discount refunded", () => {
    expect(
      couponBudgetReleaseTarget({
        platformFundedAmount: 300,
        discountAmount: 400,
        refundedCouponDiscount: 100,
      }),
    ).toBe(75);
  });

  it("never releases more than the platform funded, and nothing for a free coupon", () => {
    expect(
      couponBudgetReleaseTarget({
        platformFundedAmount: 300,
        discountAmount: 400,
        refundedCouponDiscount: 400,
      }),
    ).toBe(300);
    expect(
      couponBudgetReleaseTarget({
        platformFundedAmount: 0,
        discountAmount: 0,
        refundedCouponDiscount: 0,
      }),
    ).toBe(0);
  });
});
