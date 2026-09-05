import { describe, expect, it } from "vitest";

import { CouponEligibilityScopeType, CouponStatus, CouponType } from "#generated/prisma/enums.js";

import type { CouponLine, CouponRecord, CouponWithEligibility } from "./coupon.types.js";
import {
  isCouponWithinWindow,
  lineMatchesEligibility,
  resolveEligibleLines,
  toCouponView,
  valuateCoupon,
} from "./coupon.utils.js";

const buildCoupon = (overrides: Partial<CouponRecord> = {}): CouponRecord => ({
  id: "coupon-1",
  code: "WELCOME300",
  type: CouponType.FIXED,
  percentBasisPoints: null,
  fixedAmount: 300,
  maxDiscountAmount: null,
  minSubtotal: 0,
  startsAt: new Date("2026-01-01T00:00:00.000Z"),
  endsAt: null,
  status: CouponStatus.ACTIVE,
  totalBudgetAmount: null,
  spentAmount: 0,
  maxRedemptions: null,
  redemptionCount: 0,
  firstOrderOnly: false,
  prepaidOnly: false,
  stacksWithBrandDiscount: true,
  createdById: "admin-1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

const buildLine = (overrides: Partial<CouponLine> = {}): CouponLine => ({
  lineId: "line-1",
  productId: "product-1",
  brandId: "brand-1",
  productTypeId: "type-1",
  categoryIds: ["category-1"],
  eligibleAmount: 1_000,
  hasBrandDiscount: false,
  ...overrides,
});

describe("isCouponWithinWindow", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");

  it("is true for an active coupon inside an open-ended window", () => {
    const coupon = buildCoupon({ startsAt: new Date("2026-01-01T00:00:00.000Z"), endsAt: null });
    expect(isCouponWithinWindow(coupon, now)).toBe(true);
  });

  it("is false before startsAt", () => {
    const coupon = buildCoupon({ startsAt: new Date("2026-07-01T00:00:00.000Z") });
    expect(isCouponWithinWindow(coupon, now)).toBe(false);
  });

  it("is false after endsAt", () => {
    const coupon = buildCoupon({ endsAt: new Date("2026-05-01T00:00:00.000Z") });
    expect(isCouponWithinWindow(coupon, now)).toBe(false);
  });

  it("is false when paused or archived, even inside the time window", () => {
    expect(isCouponWithinWindow(buildCoupon({ status: CouponStatus.PAUSED }), now)).toBe(false);
    expect(isCouponWithinWindow(buildCoupon({ status: CouponStatus.ARCHIVED }), now)).toBe(false);
  });
});

describe("lineMatchesEligibility", () => {
  it("matches everything when eligibility is empty (whole catalogue)", () => {
    expect(lineMatchesEligibility(buildLine(), [])).toBe(true);
  });

  it("matches a BRAND scope by brandId", () => {
    const eligibility = [{ scopeType: CouponEligibilityScopeType.BRAND, scopeId: "brand-1" }];
    expect(lineMatchesEligibility(buildLine({ brandId: "brand-1" }), eligibility)).toBe(true);
    expect(lineMatchesEligibility(buildLine({ brandId: "brand-2" }), eligibility)).toBe(false);
  });

  it("matches a PRODUCT scope by productId", () => {
    const eligibility = [{ scopeType: CouponEligibilityScopeType.PRODUCT, scopeId: "product-1" }];
    expect(lineMatchesEligibility(buildLine({ productId: "product-1" }), eligibility)).toBe(true);
    expect(lineMatchesEligibility(buildLine({ productId: "product-2" }), eligibility)).toBe(false);
  });

  it("matches a PRODUCT_TYPE scope by productTypeId", () => {
    const eligibility = [{ scopeType: CouponEligibilityScopeType.PRODUCT_TYPE, scopeId: "type-1" }];
    expect(lineMatchesEligibility(buildLine({ productTypeId: "type-1" }), eligibility)).toBe(true);
    expect(lineMatchesEligibility(buildLine({ productTypeId: "type-2" }), eligibility)).toBe(false);
  });

  it("matches a CATEGORY scope against any of the line's categoryIds", () => {
    const eligibility = [{ scopeType: CouponEligibilityScopeType.CATEGORY, scopeId: "category-2" }];
    expect(
      lineMatchesEligibility(buildLine({ categoryIds: ["category-1", "category-2"] }), eligibility),
    ).toBe(true);
    expect(lineMatchesEligibility(buildLine({ categoryIds: ["category-1"] }), eligibility)).toBe(
      false,
    );
  });

  it("matches if any of several eligibility rows matches", () => {
    const eligibility = [
      { scopeType: CouponEligibilityScopeType.BRAND, scopeId: "other-brand" },
      { scopeType: CouponEligibilityScopeType.PRODUCT, scopeId: "product-1" },
    ];
    expect(lineMatchesEligibility(buildLine({ productId: "product-1" }), eligibility)).toBe(true);
  });
});

const withEligibility = (
  coupon: CouponRecord,
  eligibility: CouponWithEligibility["eligibility"] = [],
): CouponWithEligibility => ({ ...coupon, eligibility });

describe("resolveEligibleLines", () => {
  it("returns every line when eligibility is empty and stacking is allowed", () => {
    const coupon = withEligibility(buildCoupon());
    const lines = [buildLine({ lineId: "a" }), buildLine({ lineId: "b", hasBrandDiscount: true })];
    expect(resolveEligibleLines(coupon, lines).map((line) => line.lineId)).toEqual(["a", "b"]);
  });

  it("excludes lines with an active brand discount when stacking is disabled", () => {
    const coupon = withEligibility(buildCoupon({ stacksWithBrandDiscount: false }));
    const lines = [
      buildLine({ lineId: "a", hasBrandDiscount: false }),
      buildLine({ lineId: "b", hasBrandDiscount: true }),
    ];
    expect(resolveEligibleLines(coupon, lines).map((line) => line.lineId)).toEqual(["a"]);
  });

  it("excludes lines that don't match any eligibility scope", () => {
    const coupon = withEligibility(buildCoupon(), [
      { scopeType: CouponEligibilityScopeType.BRAND, scopeId: "brand-1" },
    ]);
    const lines = [
      buildLine({ lineId: "a", brandId: "brand-1" }),
      buildLine({ lineId: "b", brandId: "brand-2" }),
    ];
    expect(resolveEligibleLines(coupon, lines).map((line) => line.lineId)).toEqual(["a"]);
  });
});

describe("valuateCoupon", () => {
  it("values a fixed coupon and allocates it across eligible lines", () => {
    const coupon = buildCoupon({ type: CouponType.FIXED, fixedAmount: 500 });
    const lines = [
      buildLine({ lineId: "a", eligibleAmount: 1_000 }),
      buildLine({ lineId: "b", eligibleAmount: 1_000 }),
    ];
    const valuation = valuateCoupon(coupon, lines);
    expect(valuation.discountAmount).toBe(500);
    expect(
      valuation.allocations.reduce((sum, allocation) => sum + allocation.discountAmount, 0),
    ).toBe(500);
  });

  it("values a percent coupon capped by maxDiscountAmount", () => {
    const coupon = buildCoupon({
      type: CouponType.PERCENT,
      percentBasisPoints: 2_000,
      fixedAmount: null,
      maxDiscountAmount: 300,
    });
    const lines = [buildLine({ eligibleAmount: 10_000 })];
    expect(valuateCoupon(coupon, lines).discountAmount).toBe(300);
  });

  it("values to zero with no eligible lines", () => {
    expect(valuateCoupon(buildCoupon(), []).discountAmount).toBe(0);
  });
});

describe("toCouponView", () => {
  it("serializes dates and passes through fields including eligibility", () => {
    const eligibility = [{ scopeType: CouponEligibilityScopeType.BRAND, scopeId: "brand-1" }];
    const coupon = withEligibility(buildCoupon(), eligibility);
    const view = toCouponView(coupon);
    expect(view.code).toBe("WELCOME300");
    expect(view.startsAt).toBe(coupon.startsAt.toISOString());
    expect(view.endsAt).toBeNull();
    expect(view.eligibility).toEqual(eligibility);
  });
});
