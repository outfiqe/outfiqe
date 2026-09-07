import { describe, expect, it } from "vitest";

import { BrandPayoutStatus, PlatformFeeType } from "#generated/prisma/enums.js";

import type {
  BrandCommissionExemptionRecord,
  GatewayFeeRateRecord,
  PlatformCommissionRuleRecord,
  PlatformCommissionTierRecord,
} from "./brandPayout.types.js";
import {
  computeGatewayFee,
  computeTieredPlatformFee,
  toBrandCommissionExemptionView,
  toBrandPayoutView,
  toGatewayFeeRateView,
  toPlatformCommissionRuleView,
  toPlatformCommissionTierView,
} from "./brandPayout.utils.js";

const buildTier = (
  overrides: Partial<PlatformCommissionTierRecord>,
): PlatformCommissionTierRecord => ({
  id: "tier-1",
  minPrice: 0,
  maxPrice: null,
  feeType: PlatformFeeType.FLAT,
  flatAmount: 0,
  ratePercentBasisPoints: null,
  sortOrder: 0,
  ...overrides,
});

const LADDER: PlatformCommissionTierRecord[] = [
  buildTier({
    id: "tier-flat",
    minPrice: 0,
    maxPrice: 1_000,
    feeType: PlatformFeeType.FLAT,
    flatAmount: 30,
  }),
  buildTier({
    id: "tier-5pct",
    minPrice: 1_000,
    maxPrice: 2_000,
    feeType: PlatformFeeType.PERCENT,
    flatAmount: null,
    ratePercentBasisPoints: 500,
  }),
  buildTier({
    id: "tier-4pct",
    minPrice: 2_000,
    maxPrice: null,
    feeType: PlatformFeeType.PERCENT,
    flatAmount: null,
    ratePercentBasisPoints: 400,
  }),
];

describe("computeTieredPlatformFee", () => {
  it("charges the flat amount for a price in the lowest band", () => {
    expect(computeTieredPlatformFee(500, LADDER)).toEqual({ fee: 30, tierId: "tier-flat" });
  });

  it("charges the flat amount at the exact lower boundary", () => {
    expect(computeTieredPlatformFee(0, LADDER)).toEqual({ fee: 30, tierId: "tier-flat" });
  });

  it("charges the flat amount at the exact upper boundary of the first band", () => {
    expect(computeTieredPlatformFee(1_000, LADDER)).toEqual({ fee: 30, tierId: "tier-flat" });
  });

  it("charges a percent of the whole price, not a marginal slice, for a price in a higher band", () => {
    expect(computeTieredPlatformFee(1_500, LADDER)).toEqual({ fee: 75, tierId: "tier-5pct" });
  });

  it("uses the open-ended top band for a very high price", () => {
    expect(computeTieredPlatformFee(50_000, LADDER)).toEqual({ fee: 2_000, tierId: "tier-4pct" });
  });

  it("charges 0 when a FLAT tier has no flatAmount configured", () => {
    const noAmountLadder = [
      buildTier({
        id: "tier-empty-flat",
        minPrice: 0,
        maxPrice: null,
        feeType: PlatformFeeType.FLAT,
        flatAmount: null,
      }),
    ];
    expect(computeTieredPlatformFee(500, noAmountLadder)).toEqual({
      fee: 0,
      tierId: "tier-empty-flat",
    });
  });

  it("rounds the percent fee to the nearest rupee", () => {
    const oddLadder = [
      buildTier({
        id: "tier-odd",
        minPrice: 0,
        maxPrice: null,
        feeType: PlatformFeeType.PERCENT,
        flatAmount: null,
        ratePercentBasisPoints: 333,
      }),
    ];
    expect(computeTieredPlatformFee(1_000, oddLadder)).toEqual({ fee: 33, tierId: "tier-odd" });
  });

  it("charges 0 when a PERCENT tier has no rate configured", () => {
    const noRateLadder = [
      buildTier({
        id: "tier-empty-percent",
        minPrice: 0,
        maxPrice: null,
        feeType: PlatformFeeType.PERCENT,
        ratePercentBasisPoints: null,
      }),
    ];
    expect(computeTieredPlatformFee(500, noRateLadder)).toEqual({
      fee: 0,
      tierId: "tier-empty-percent",
    });
  });

  it("throws when no tier covers the price (an unreachable state given validated bands)", () => {
    const gappedLadder = [
      buildTier({
        id: "tier-a",
        minPrice: 0,
        maxPrice: 1_000,
        feeType: PlatformFeeType.FLAT,
        flatAmount: 30,
      }),
      buildTier({
        id: "tier-b",
        minPrice: 2_000,
        maxPrice: null,
        feeType: PlatformFeeType.PERCENT,
        flatAmount: null,
        ratePercentBasisPoints: 500,
      }),
    ];
    expect(() => computeTieredPlatformFee(1_500, gappedLadder)).toThrow();
  });
});

const buildRate = (
  paymentMethod: GatewayFeeRateRecord["paymentMethod"],
  ratePercentBasisPoints: number,
): GatewayFeeRateRecord => ({
  id: "rate-1",
  paymentMethod,
  ratePercentBasisPoints,
  isActive: true,
  createdAt: new Date(),
});

describe("computeGatewayFee", () => {
  it("is always 0 for COD regardless of any configured rate", () => {
    expect(computeGatewayFee(10_000, "COD", buildRate("ESEWA", 200))).toBe(0);
    expect(computeGatewayFee(10_000, "COD", null)).toBe(0);
  });

  it("computes eSewa's cut from its own rate", () => {
    expect(computeGatewayFee(1_000, "ESEWA", buildRate("ESEWA", 200))).toBe(20);
  });

  it("computes Khalti's cut from its own rate", () => {
    expect(computeGatewayFee(5_000, "KHALTI", buildRate("KHALTI", 150))).toBe(75);
  });

  it("throws when no active rate is configured for a non-COD method", () => {
    expect(() => computeGatewayFee(1_000, "ESEWA", null)).toThrow();
  });
});

describe("toPlatformCommissionTierView", () => {
  it("converts a percent tier's basis points to a percent", () => {
    const tier = buildTier({ feeType: PlatformFeeType.PERCENT, ratePercentBasisPoints: 250 });
    expect(toPlatformCommissionTierView(tier).ratePercent).toBe(2.5);
  });

  it("leaves ratePercent null for a flat tier with no basis points", () => {
    const tier = buildTier({ feeType: PlatformFeeType.FLAT, ratePercentBasisPoints: null });
    expect(toPlatformCommissionTierView(tier).ratePercent).toBeNull();
  });
});

describe("toPlatformCommissionRuleView", () => {
  it("serializes the rule and maps every tier", () => {
    const rule: PlatformCommissionRuleRecord = {
      id: "rule-1",
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      tiers: [buildTier({ id: "tier-1" }), buildTier({ id: "tier-2" })],
    };

    const view = toPlatformCommissionRuleView(rule);

    expect(view.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(view.tiers.map((tier) => tier.id)).toEqual(["tier-1", "tier-2"]);
  });
});

describe("toGatewayFeeRateView", () => {
  it("converts basis points to a percent and serializes the date", () => {
    const rate = buildRate("ESEWA", 275);
    expect(toGatewayFeeRateView(rate).ratePercent).toBe(2.75);
  });
});

describe("toBrandCommissionExemptionView", () => {
  const baseExemption: BrandCommissionExemptionRecord = {
    id: "exemption-1",
    brandId: "brand-1",
    brandName: "Acme",
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    endsAt: new Date("2026-02-01T00:00:00.000Z"),
    reason: "Launch promo",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    revokedAt: null,
  };

  it("reports a null revokedAt as still active", () => {
    expect(toBrandCommissionExemptionView(baseExemption).revokedAt).toBeNull();
  });

  it("serializes revokedAt once the exemption has been revoked", () => {
    const revokedAt = new Date("2026-01-15T00:00:00.000Z");
    expect(toBrandCommissionExemptionView({ ...baseExemption, revokedAt }).revokedAt).toBe(
      revokedAt.toISOString(),
    );
  });
});

describe("toBrandPayoutView", () => {
  it("flattens the order item's product into the payout view", () => {
    const view = toBrandPayoutView({
      id: "payout-1",
      grossAmount: 1_000,
      platformFee: 30,
      netAmount: 970,
      status: BrandPayoutStatus.AVAILABLE,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      orderItem: {
        platformDiscountAmount: 0,
        product: { name: "Jacket", imageUrl: "jacket.png" },
      },
    });

    expect(view).toEqual({
      id: "payout-1",
      productName: "Jacket",
      imageUrl: "jacket.png",
      grossAmount: 1_000,
      platformFee: 30,
      netAmount: 970,
      status: BrandPayoutStatus.AVAILABLE,
      platformFundedDiscountApplied: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("flags the payout as platform-funded when the order item carried a coupon discount", () => {
    const view = toBrandPayoutView({
      id: "payout-2",
      grossAmount: 1_000,
      platformFee: 30,
      netAmount: 970,
      status: BrandPayoutStatus.AVAILABLE,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      orderItem: {
        platformDiscountAmount: 150,
        product: { name: "Jacket", imageUrl: "jacket.png" },
      },
    });

    expect(view.platformFundedDiscountApplied).toBe(true);
  });
});
