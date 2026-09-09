import { describe, expect, it } from "vitest";

import { PaymentMethod } from "#generated/prisma/enums.js";

import { buildPaymentMethodBreakdown, sumStatusBuckets } from "./financialRollup.utils.js";

describe("sumStatusBuckets", () => {
  it("adds up only the requested statuses and treats a missing bucket as zero", () => {
    const byStatus = { PENDING: 100, AVAILABLE: 40, PAID: 9000, VOIDED: 7 };

    expect(sumStatusBuckets(byStatus, ["PENDING", "AVAILABLE"])).toBe(140);
    expect(sumStatusBuckets(byStatus, ["PENDING", "APPROVED", "AVAILABLE"])).toBe(140);
  });

  it("returns zero when nothing matches", () => {
    expect(sumStatusBuckets({}, ["PENDING"])).toBe(0);
    expect(sumStatusBuckets({ PAID: 500 }, ["PENDING", "AVAILABLE"])).toBe(0);
  });
});

describe("buildPaymentMethodBreakdown", () => {
  it("computes GMV, order count, and realized take rate per payment method", () => {
    const breakdown = buildPaymentMethodBreakdown(
      [
        { paymentMethod: PaymentMethod.COD, total: 1000, orderCount: 2 },
        { paymentMethod: PaymentMethod.ESEWA, total: 2000, orderCount: 4 },
      ],
      [
        { paymentMethod: PaymentMethod.COD, platformFee: 50, gatewayFee: 0 },
        { paymentMethod: PaymentMethod.ESEWA, platformFee: 100, gatewayFee: 30 },
      ],
    );

    expect(breakdown.COD).toEqual({ gmv: 1000, orderCount: 2, realizedTakeRate: 0.05 });
    expect(breakdown.ESEWA).toEqual({ gmv: 2000, orderCount: 4, realizedTakeRate: 0.035 });
  });

  it("defaults fees to zero when a method has GMV but no realized payouts yet", () => {
    const breakdown = buildPaymentMethodBreakdown(
      [{ paymentMethod: PaymentMethod.KHALTI, total: 500, orderCount: 1 }],
      [],
    );

    expect(breakdown.KHALTI).toEqual({ gmv: 500, orderCount: 1, realizedTakeRate: 0 });
  });

  it("never divides by zero when a method has zero GMV", () => {
    const breakdown = buildPaymentMethodBreakdown(
      [{ paymentMethod: PaymentMethod.COD, total: 0, orderCount: 0 }],
      [{ paymentMethod: PaymentMethod.COD, platformFee: 0, gatewayFee: 0 }],
    );

    expect(breakdown.COD?.realizedTakeRate).toBe(0);
  });

  it("omits methods with no orders in the range", () => {
    const breakdown = buildPaymentMethodBreakdown([], []);
    expect(breakdown).toEqual({});
  });
});
