import { describe, expect, it } from "vitest";

import type { FinancialRollup } from "../api/financialRollupSchemas";
import { buildRollupInsight } from "./rollupInsight.utils";

const buildRollup = (
  grossCollected: number,
  netHeld: number,
  owedToBrands: number,
  owedToCreators: number,
): FinancialRollup => ({
  range: "cycle",
  gateway: { grossCollected, refunded: grossCollected - netHeld, netHeld },
  ledger: {
    owedToBrands,
    owedToCreators,
    brandPayoutsByStatus: {},
    creatorCommissionsByStatus: {},
    platformRevenueRealized: 0,
    couponSpend: 0,
    netPlatformRevenue: 0,
  },
  byPaymentMethod: {},
  attribution: { totalItems: 0, attributedItems: 0, attributedShare: 0 },
});

describe("buildRollupInsight", () => {
  it("says nothing moved when there is no money at all", () => {
    expect(buildRollupInsight(buildRollup(0, 0, 0, 0)).headline).toBe(
      "No money moved in this period",
    );
  });

  it("warns when more is owed than held", () => {
    const { tone, headline } = buildRollupInsight(buildRollup(100, 100, 90, 20));

    expect(tone).toBe("negative");
    expect(headline).toBe("You owe more than you hold");
  });

  it("treats owing exactly what is held as fine", () => {
    expect(buildRollupInsight(buildRollup(100, 100, 80, 20)).tone).toBe("neutral");
  });

  it("warns even when nothing came in but money is owed", () => {
    expect(buildRollupInsight(buildRollup(0, 0, 50, 0)).tone).toBe("negative");
  });
});
