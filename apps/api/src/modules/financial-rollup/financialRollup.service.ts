import { startOfMonth } from "date-fns/startOfMonth";

import { PaymentTransactionType } from "#generated/prisma/enums.js";

import {
  OUTSTANDING_BRAND_PAYOUT_STATUSES,
  OUTSTANDING_COMMISSION_STATUSES,
} from "./financialRollup.constants.js";
import { financialRollupRepository } from "./financialRollup.repository.js";
import type { FinancialRollupQuery } from "./financialRollup.schemas.js";
import type { FinancialRollupRange, FinancialRollupView } from "./financialRollup.types.js";
import { buildPaymentMethodBreakdown, sumStatusBuckets } from "./financialRollup.utils.js";

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
      creatorCommissionsByStatus,
      brandPayoutsByStatus,
      platformRevenueRealized,
      couponSpend,
      paymentMethodOrderTotals,
      paymentMethodPayoutFees,
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
      financialRollupRepository.sumOrderTotalsByPaymentMethod(
        PaymentTransactionType.PAYMENT,
        since,
      ),
      financialRollupRepository.sumRealizedBrandPayoutFeesByPaymentMethod(since),
    ]);

    return {
      range,
      gateway: {
        grossCollected,
        refunded,
        netHeld: grossCollected - refunded,
      },
      ledger: {
        owedToBrands: sumStatusBuckets(brandPayoutsByStatus, OUTSTANDING_BRAND_PAYOUT_STATUSES),
        owedToCreators: sumStatusBuckets(
          creatorCommissionsByStatus,
          OUTSTANDING_COMMISSION_STATUSES,
        ),
        brandPayoutsByStatus,
        creatorCommissionsByStatus,
        platformRevenueRealized,
        couponSpend,
        netPlatformRevenue: platformRevenueRealized - couponSpend,
      },
      byPaymentMethod: buildPaymentMethodBreakdown(
        paymentMethodOrderTotals,
        paymentMethodPayoutFees,
      ),
    };
  },
};
