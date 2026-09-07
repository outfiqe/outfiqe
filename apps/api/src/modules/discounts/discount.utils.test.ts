import { describe, expect, it } from "vitest";

import {
  allocatePlatformDiscountToLines,
  assertOrderMoneyInvariant,
  computeCouponValue,
  computeDiscountPercent,
  isBrandDiscountWithinCeiling,
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "./discount.utils.js";

describe("toActiveBrandDiscount", () => {
  it("returns null for null or undefined", () => {
    expect(toActiveBrandDiscount(null)).toBeNull();
    expect(toActiveBrandDiscount(undefined)).toBeNull();
  });

  it("picks exactly the three pricing-kernel fields off a richer record", () => {
    const richDiscount = {
      id: "discount-1",
      productId: "product-1",
      discountType: "PERCENT" as const,
      percentBasisPoints: 1_500,
      fixedAmount: null,
      startsAt: new Date(),
      endsAt: null,
      isActive: true,
    };
    expect(toActiveBrandDiscount(richDiscount)).toEqual({
      discountType: "PERCENT",
      percentBasisPoints: 1_500,
      fixedAmount: null,
    });
  });
});

describe("computeDiscountPercent", () => {
  it("returns null when the effective price is not lower than list price", () => {
    expect(computeDiscountPercent(2_000, 2_000)).toBeNull();
    expect(computeDiscountPercent(2_000, 2_100)).toBeNull();
  });

  it("rounds the percentage off to the nearest whole number", () => {
    expect(computeDiscountPercent(2_000, 1_500)).toBe(25);
    expect(computeDiscountPercent(3_000, 2_000)).toBe(33);
  });
});

describe("resolveBrandFundedUnitPrice", () => {
  it("returns the list price unchanged when there is no active discount", () => {
    expect(resolveBrandFundedUnitPrice(2_000, null)).toBe(2_000);
  });

  it("applies a percent discount and rounds to the nearest rupee", () => {
    expect(
      resolveBrandFundedUnitPrice(2_000, {
        discountType: "PERCENT",
        percentBasisPoints: 2_000,
        fixedAmount: null,
      }),
    ).toBe(1_600);
  });

  it("applies a fixed discount", () => {
    expect(
      resolveBrandFundedUnitPrice(2_000, {
        discountType: "FIXED",
        percentBasisPoints: null,
        fixedAmount: 400,
      }),
    ).toBe(1_600);
  });

  it("floors the effective price at the minimum, never going to zero or negative", () => {
    expect(
      resolveBrandFundedUnitPrice(100, {
        discountType: "FIXED",
        percentBasisPoints: null,
        fixedAmount: 500,
      }),
    ).toBe(1);
  });

  it("treats a missing percent amount as no discount", () => {
    expect(
      resolveBrandFundedUnitPrice(2_000, {
        discountType: "PERCENT",
        percentBasisPoints: null,
        fixedAmount: null,
      }),
    ).toBe(2_000);
  });

  it("treats a missing fixed amount as no discount", () => {
    expect(
      resolveBrandFundedUnitPrice(2_000, {
        discountType: "FIXED",
        percentBasisPoints: null,
        fixedAmount: null,
      }),
    ).toBe(2_000);
  });
});

describe("isBrandDiscountWithinCeiling", () => {
  it("allows a percent discount at exactly the ceiling", () => {
    expect(
      isBrandDiscountWithinCeiling(2_000, {
        discountType: "PERCENT",
        percentBasisPoints: 7_000,
        fixedAmount: null,
      }),
    ).toBe(true);
  });

  it("rejects a percent discount above the ceiling", () => {
    expect(
      isBrandDiscountWithinCeiling(2_000, {
        discountType: "PERCENT",
        percentBasisPoints: 7_500,
        fixedAmount: null,
      }),
    ).toBe(false);
  });

  it("rejects a fixed discount whose amount exceeds the ceiling's equivalent rupee value", () => {
    expect(
      isBrandDiscountWithinCeiling(2_000, {
        discountType: "FIXED",
        percentBasisPoints: null,
        fixedAmount: 1_401,
      }),
    ).toBe(false);
  });

  it("allows a fixed discount at exactly the ceiling's equivalent rupee value", () => {
    expect(
      isBrandDiscountWithinCeiling(2_000, {
        discountType: "FIXED",
        percentBasisPoints: null,
        fixedAmount: 1_400,
      }),
    ).toBe(true);
  });
});

describe("computeCouponValue", () => {
  it("computes a percent coupon and rounds to the nearest rupee", () => {
    expect(
      computeCouponValue(
        { type: "PERCENT", percentBasisPoints: 1_000, fixedAmount: null, maxDiscountAmount: null },
        3_333,
      ),
    ).toBe(333);
  });

  it("computes a fixed coupon", () => {
    expect(
      computeCouponValue(
        { type: "FIXED", percentBasisPoints: null, fixedAmount: 400, maxDiscountAmount: null },
        5_000,
      ),
    ).toBe(400);
  });

  it("caps a percent coupon at maxDiscountAmount", () => {
    expect(
      computeCouponValue(
        { type: "PERCENT", percentBasisPoints: 2_000, fixedAmount: null, maxDiscountAmount: 600 },
        10_000,
      ),
    ).toBe(600);
  });

  it("never exceeds the eligible subtotal", () => {
    expect(
      computeCouponValue(
        { type: "FIXED", percentBasisPoints: null, fixedAmount: 5_000, maxDiscountAmount: null },
        2_000,
      ),
    ).toBe(2_000);
  });

  it("never goes negative", () => {
    expect(
      computeCouponValue(
        { type: "FIXED", percentBasisPoints: null, fixedAmount: -100, maxDiscountAmount: null },
        2_000,
      ),
    ).toBe(0);
  });

  it("treats a missing percent amount as a zero-value coupon", () => {
    expect(
      computeCouponValue(
        { type: "PERCENT", percentBasisPoints: null, fixedAmount: null, maxDiscountAmount: null },
        2_000,
      ),
    ).toBe(0);
  });

  it("treats a missing fixed amount as a zero-value coupon", () => {
    expect(
      computeCouponValue(
        { type: "FIXED", percentBasisPoints: null, fixedAmount: null, maxDiscountAmount: null },
        2_000,
      ),
    ).toBe(0);
  });
});

const totalAllocated = (allocations: { discountAmount: number }[]) =>
  allocations.reduce((sum, allocation) => sum + allocation.discountAmount, 0);

describe("allocatePlatformDiscountToLines", () => {
  it("returns zero for every line when the discount is zero", () => {
    const allocations = allocatePlatformDiscountToLines(0, [
      { orderItemId: "a", eligibleAmount: 1_000 },
      { orderItemId: "b", eligibleAmount: 1_000 },
    ]);
    expect(allocations).toEqual([
      { orderItemId: "a", discountAmount: 0 },
      { orderItemId: "b", discountAmount: 0 },
    ]);
  });

  it("returns zero for every line when there are no lines", () => {
    expect(allocatePlatformDiscountToLines(500, [])).toEqual([]);
  });

  it("allocates a Rs 100 discount across 3 equal Rs 33.3.. lines without losing a rupee", () => {
    const allocations = allocatePlatformDiscountToLines(100, [
      { orderItemId: "a", eligibleAmount: 100 },
      { orderItemId: "b", eligibleAmount: 100 },
      { orderItemId: "c", eligibleAmount: 100 },
    ]);
    expect(totalAllocated(allocations)).toBe(100);
    for (const allocation of allocations) {
      expect(allocation.discountAmount).toBeGreaterThanOrEqual(33);
      expect(allocation.discountAmount).toBeLessThanOrEqual(34);
    }
  });

  it("gives the leftover rupee to the line with the largest remainder, tie-broken by value then id", () => {
    const allocations = allocatePlatformDiscountToLines(100, [
      { orderItemId: "line-b", eligibleAmount: 100 },
      { orderItemId: "line-a", eligibleAmount: 100 },
      { orderItemId: "line-c", eligibleAmount: 100 },
    ]);
    const winner = allocations.find((allocation) => allocation.discountAmount === 34);
    expect(winner?.orderItemId).toBe("line-a");
  });

  it("allocates a discount across a line worth less than its proportional share without exceeding it", () => {
    const allocations = allocatePlatformDiscountToLines(500, [
      { orderItemId: "small", eligibleAmount: 10 },
      { orderItemId: "large", eligibleAmount: 1_000 },
    ]);
    expect(totalAllocated(allocations)).toBe(500);
    const small = allocations.find((allocation) => allocation.orderItemId === "small");
    expect(small?.discountAmount).toBeLessThanOrEqual(10);
  });

  it("consumes the whole subtotal exactly when the discount equals it", () => {
    const lines = [
      { orderItemId: "a", eligibleAmount: 1_000 },
      { orderItemId: "b", eligibleAmount: 1_001 },
    ];
    const allocations = allocatePlatformDiscountToLines(2_001, lines);
    expect(allocations).toEqual([
      { orderItemId: "a", discountAmount: 1_000 },
      { orderItemId: "b", discountAmount: 1_001 },
    ]);
  });

  it("caps the discount at the eligible subtotal when it would otherwise overshoot", () => {
    const allocations = allocatePlatformDiscountToLines(5_000, [
      { orderItemId: "a", eligibleAmount: 1_000 },
    ]);
    expect(totalAllocated(allocations)).toBe(1_000);
    expect(allocations[0]?.discountAmount).toBe(1_000);
  });

  it("allocates the whole discount to a single-line cart", () => {
    const allocations = allocatePlatformDiscountToLines(300, [
      { orderItemId: "only", eligibleAmount: 2_000 },
    ]);
    expect(allocations).toEqual([{ orderItemId: "only", discountAmount: 300 }]);
  });

  it("ignores zero-value lines and never allocates to them", () => {
    const allocations = allocatePlatformDiscountToLines(100, [
      { orderItemId: "zero", eligibleAmount: 0 },
      { orderItemId: "real", eligibleAmount: 500 },
    ]);
    expect(allocations).toEqual([
      { orderItemId: "zero", discountAmount: 0 },
      { orderItemId: "real", discountAmount: 100 },
    ]);
  });

  it("is stable under input reordering — the same lines produce the same per-line results", () => {
    const lines = [
      { orderItemId: "a", eligibleAmount: 733 },
      { orderItemId: "b", eligibleAmount: 219 },
      { orderItemId: "c", eligibleAmount: 1_048 },
    ];
    const forward = allocatePlatformDiscountToLines(500, lines);
    const reversed = allocatePlatformDiscountToLines(500, [...lines].reverse());

    const byId = (allocations: typeof forward) =>
      Object.fromEntries(
        allocations.map((allocation) => [allocation.orderItemId, allocation.discountAmount]),
      );
    expect(byId(forward)).toEqual(byId(reversed));
  });

  const createSeededRandom = (seed: number) => {
    let state = seed;
    return () => {
      state = (state * 1_664_525 + 1_013_904_223) >>> 0;
      return state / 0xffffffff;
    };
  };

  it("always sums exactly to the requested discount (capped at eligible subtotal), never negative, never over a line's value — across randomised inputs", () => {
    const nextRandom = createSeededRandom(42);

    for (let trial = 0; trial < 200; trial += 1) {
      const lineCount = 1 + Math.floor(nextRandom() * 6);
      const lines = Array.from({ length: lineCount }, (_, index) => ({
        orderItemId: `line-${index}`,
        eligibleAmount: 1 + Math.floor(nextRandom() * 5_000),
      }));
      const eligibleSubtotal = lines.reduce((sum, line) => sum + line.eligibleAmount, 0);
      const discountAmount = Math.floor(nextRandom() * eligibleSubtotal * 1.5);

      const allocations = allocatePlatformDiscountToLines(discountAmount, lines);
      const expectedTotal = Math.min(discountAmount, eligibleSubtotal);

      expect(totalAllocated(allocations)).toBe(expectedTotal);

      for (const allocation of allocations) {
        const line = lines.find((candidate) => candidate.orderItemId === allocation.orderItemId);
        expect(allocation.discountAmount).toBeGreaterThanOrEqual(0);
        expect(allocation.discountAmount).toBeLessThanOrEqual(line?.eligibleAmount ?? 0);
      }
    }
  });
});

describe("assertOrderMoneyInvariant", () => {
  it("passes silently when the order's money is internally consistent", () => {
    expect(() =>
      assertOrderMoneyInvariant({
        subtotal: 2_000,
        platformDiscountTotal: 400,
        deliveryFee: 100,
        codFee: 0,
        total: 1_700,
        platformDiscountAllocations: [400],
      }),
    ).not.toThrow();
  });

  it("throws when total does not equal subtotal minus the platform discount plus fees", () => {
    expect(() =>
      assertOrderMoneyInvariant({
        subtotal: 2_000,
        platformDiscountTotal: 400,
        deliveryFee: 100,
        codFee: 0,
        total: 1_600,
        platformDiscountAllocations: [400],
      }),
    ).toThrow(/money invariant violated/i);
  });

  it("throws when the per-line allocations do not sum to the order's platform discount total", () => {
    expect(() =>
      assertOrderMoneyInvariant({
        subtotal: 2_000,
        platformDiscountTotal: 400,
        deliveryFee: 100,
        codFee: 0,
        total: 1_700,
        platformDiscountAllocations: [300, 50],
      }),
    ).toThrow(/money invariant violated/i);
  });
});
