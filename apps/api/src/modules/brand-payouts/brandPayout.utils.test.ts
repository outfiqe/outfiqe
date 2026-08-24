import { describe, expect, it } from "vitest";

import { PlatformFeeType } from "#generated/prisma/enums.js";

import type { GatewayFeeRateRecord, PlatformCommissionTierRecord } from "./brandPayout.types.js";
import { computeGatewayFee, computeTieredPlatformFee } from "./brandPayout.utils.js";

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
