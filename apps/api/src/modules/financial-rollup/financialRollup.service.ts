import { startOfMonth } from "date-fns/startOfMonth";

import { PaymentTransactionType } from "#generated/prisma/enums.js";

import { financialRollupRepository } from "./financialRollup.repository.js";
import type { FinancialRollupQuery } from "./financialRollup.schemas.js";
import type { FinancialRollupRange, FinancialRollupView } from "./financialRollup.types.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const resolveRangeStart = (range: FinancialRollupRange, now: Date): Date | null => {
  if (range === "all") return null;
  if (range === "30d") return new Date(now.getTime() - THIRTY_DAYS_MS);
  return startOfMonth(now);
};

export const financialRollupService = {
  async getRollup({ range }: FinancialRollupQuery): Promise<FinancialRollupView> {
    const since = resolveRangeStart(range, new Date());

    const [
      grossCollected,
      refunded,
      owedToCreators,
      owedToBrands,
      platformRevenueRealized,
      couponSpend,
    ] = await Promise.all([
      financialRollupRepository.sumOrderTotalsForTransactionType(
        PaymentTransactionType.PAYMENT,
        since,
      ),
      financialRollupRepository.sumOrderTotalsForTransactionType(
        PaymentTransactionType.REFUND,
        since,
      ),
      financialRollupRepository.sumCreatorCommissionsByStatus(since),
      financialRollupRepository.sumBrandPayoutsByStatus(since),
      financialRollupRepository.sumRealizedPlatformFee(since),
      financialRollupRepository.sumCouponSpend(since),
    ]);

    return {
      range,
      gateway: {
        grossCollected,
        refunded,
        netHeld: grossCollected - refunded,
      },
      ledger: {
        owedToBrands,
        owedToCreators,
        platformRevenueRealized,
        couponSpend,
        netPlatformRevenue: platformRevenueRealized - couponSpend,
      },
    };
  },
};
