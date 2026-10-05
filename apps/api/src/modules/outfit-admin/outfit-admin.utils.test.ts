import { describe, expect, it } from "vitest";

import { CommissionScope } from "#generated/prisma/enums.js";

import { toCommissionTierUsage, toCountByWeek, weekKey } from "./outfit-admin.utils.js";

describe("toCountByWeek", () => {
  it("turns database week rows into counts keyed by week", () => {
    const weekStart = new Date("2026-09-28T00:00:00.000Z");

    const countsByWeek = toCountByWeek([{ week_start: weekStart, count: 7n }]);

    expect(countsByWeek.get(weekKey(weekStart))).toBe(7);
    expect(countsByWeek.size).toBe(1);
  });
});

describe("toCommissionTierUsage", () => {
  const lookTier = {
    id: "tier-look",
    scope: CommissionScope.CREATOR_LOOK,
    minPrice: 0,
    maxPrice: 2_000,
    amount: 50,
  };
  const buildTierHigh = {
    id: "tier-build-high",
    scope: CommissionScope.OUTFIT_BUILD,
    minPrice: 5_000,
    maxPrice: null,
    amount: 300,
  };
  const buildTierLow = {
    id: "tier-build-low",
    scope: CommissionScope.OUTFIT_BUILD,
    minPrice: 0,
    maxPrice: 4_999,
    amount: 100,
  };

  it("joins each tier's rate to its usage, grouped by scope and ordered by price", () => {
    const usage = toCommissionTierUsage(
      [
        { tierId: "tier-build-high", _count: { _all: 2 }, _sum: { amount: 600 } },
        { tierId: "tier-look", _count: { _all: 3 }, _sum: { amount: 150 } },
        { tierId: "tier-build-low", _count: { _all: 1 }, _sum: { amount: null } },
      ],
      [lookTier, buildTierHigh, buildTierLow],
    );

    expect(usage.map(({ tierId }) => tierId)).toEqual([
      "tier-look",
      "tier-build-low",
      "tier-build-high",
    ]);
    expect(usage[1]).toMatchObject({ commissionCount: 1, totalAmount: 0 });
    expect(usage[2]).toMatchObject({ amount: 300, maxPrice: null, totalAmount: 600 });
  });

  it("skips usage whose tier no longer exists", () => {
    expect(
      toCommissionTierUsage([{ tierId: "gone", _count: { _all: 1 }, _sum: { amount: 10 } }], []),
    ).toEqual([]);
  });
});
