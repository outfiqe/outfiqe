import { describe, expect, it } from "vitest";

import { CommissionScope, CommissionSource, CommissionStatus } from "#generated/prisma/enums.js";

import { COMMISSION_RECIPIENT_KIND } from "./commission.constants.js";
import {
  findOverlappingTierIds,
  parseCommissionTierRow,
  splitBuildCommission,
  toAdminCommissionView,
} from "./commission.utils.js";

describe("splitBuildCommission", () => {
  it("splits the commission equally between everyone on the build", () => {
    expect(splitBuildCommission(300, ["sita", "ram", "gita"], "buyer")).toEqual([
      { contributorId: "sita", amount: 100 },
      { contributorId: "ram", amount: 100 },
      { contributorId: "gita", amount: 100 },
    ]);
  });

  it("hands leftover rupees out one each, owner first, so the shares add up", () => {
    const shares = splitBuildCommission(101, ["sita", "ram", "gita"], "buyer");

    expect(shares).toEqual([
      { contributorId: "sita", amount: 34 },
      { contributorId: "ram", amount: 34 },
      { contributorId: "gita", amount: 33 },
    ]);
    expect(shares.reduce((sum, { amount }) => sum + amount, 0)).toBe(101);
  });

  it("gives a contributor who buys from their own build nothing, without growing the others' shares", () => {
    expect(splitBuildCommission(300, ["sita", "ram", "gita"], "ram")).toEqual([
      { contributorId: "sita", amount: 100 },
      { contributorId: "gita", amount: 100 },
    ]);
  });

  it("counts each contributor once and drops shares too small to pay", () => {
    expect(splitBuildCommission(2, ["sita", "sita", "ram", "gita"], "buyer")).toEqual([
      { contributorId: "sita", amount: 1 },
      { contributorId: "ram", amount: 1 },
    ]);
  });

  it("pays nothing when there is no commission or nobody to pay", () => {
    expect(splitBuildCommission(0, ["sita"], "buyer")).toEqual([]);
    expect(splitBuildCommission(300, [], "buyer")).toEqual([]);
    expect(splitBuildCommission(300, ["sita"], "sita")).toEqual([]);
  });
});

describe("findOverlappingTierIds", () => {
  it("flags tiers whose price ranges share any price, both ways", () => {
    const overlaps = findOverlappingTierIds([
      { id: "low", minPrice: 0, maxPrice: 1000 },
      { id: "middle", minPrice: 1000, maxPrice: 3000 },
      { id: "high", minPrice: 3001, maxPrice: null },
    ]);

    expect(overlaps.get("low")).toEqual(["middle"]);
    expect(overlaps.get("middle")).toEqual(["low"]);
    expect(overlaps.get("high")).toEqual([]);
  });

  it("treats a tier with no top price as covering every higher price", () => {
    const overlaps = findOverlappingTierIds([
      { id: "open", minPrice: 500, maxPrice: null },
      { id: "later", minPrice: 9000, maxPrice: 9999 },
    ]);

    expect(overlaps.get("open")).toEqual(["later"]);
  });

  it("returns an empty list for every tier when nothing overlaps", () => {
    const overlaps = findOverlappingTierIds([
      { id: "a", minPrice: 0, maxPrice: 99 },
      { id: "b", minPrice: 100, maxPrice: 199 },
    ]);

    expect([...overlaps.values()]).toEqual([[], []]);
  });
});

describe("parseCommissionTierRow", () => {
  const storedTier = {
    id: "tier-1",
    scope: CommissionScope.OUTFIT_BUILD,
    minPrice: 0,
    maxPrice: null,
    amount: 50,
    sortOrder: 0,
  };

  it("reads a tier saved in the change history back", () => {
    expect(parseCommissionTierRow(storedTier)).toEqual(storedTier);
  });

  it("returns null for anything that isn't a stored tier", () => {
    expect(parseCommissionTierRow(null)).toBeNull();
    expect(parseCommissionTierRow("tier")).toBeNull();
    expect(parseCommissionTierRow({ ...storedTier, scope: "SOMETHING_ELSE" })).toBeNull();
    expect(parseCommissionTierRow({ ...storedTier, amount: "50" })).toBeNull();
  });
});

describe("toAdminCommissionView", () => {
  const baseRow = {
    id: "commission-1",
    source: CommissionSource.OUTFIT_BUILD,
    status: CommissionStatus.PENDING,
    amount: 40,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    orderItem: { product: { name: "Kurta", brand: { name: "Dhaka House" } } },
  };

  it("names the person who earns a share", () => {
    const view = toAdminCommissionView({
      ...baseRow,
      creator: { name: "Sita" },
      recipientBrand: null,
    });

    expect(view.recipientName).toBe("Sita");
    expect(view.recipientKind).toBe(COMMISSION_RECIPIENT_KIND.PERSON);
  });

  it("names the brand when the share goes to a brand's balance", () => {
    const view = toAdminCommissionView({
      ...baseRow,
      creator: null,
      recipientBrand: { name: "Dhaka House" },
    });

    expect(view.recipientName).toBe("Dhaka House");
    expect(view.recipientKind).toBe(COMMISSION_RECIPIENT_KIND.BRAND);
  });
});
