import type { BrandPayoutStatus, CommissionStatus } from "#generated/prisma/enums.js";

export type FinancialRollupRange = "cycle" | "30d" | "all";

export type FinancialRollupView = {
  range: FinancialRollupRange;
  gateway: {
    grossCollected: number;
    refunded: number;
    netHeld: number;
  };
  ledger: {
    owedToBrands: Partial<Record<BrandPayoutStatus, number>>;
    owedToCreators: Partial<Record<CommissionStatus, number>>;
    platformRevenueRealized: number;
  };
};
