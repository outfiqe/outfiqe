import { startOfMonth } from "date-fns/startOfMonth";

import { PaymentTransactionType } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";

import {
  MAX_LEDGER_EXPORT_ROWS,
  OUTSTANDING_BRAND_PAYOUT_STATUSES,
  OUTSTANDING_COMMISSION_STATUSES,
} from "./financialRollup.constants.js";
import { financialRollupRepository } from "./financialRollup.repository.js";
import type {
  FinancialLedgerExportQuery,
  FinancialLedgerQuery,
  FinancialRollupQuery,
} from "./financialRollup.schemas.js";
import type {
  FinancialRollupRange,
  FinancialRollupView,
  LedgerPage,
} from "./financialRollup.types.js";
import {
  buildPaymentMethodBreakdown,
  decodeLedgerCursor,
  encodeLedgerCursor,
  sumStatusBuckets,
  toLedgerCsv,
} from "./financialRollup.utils.js";

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

  async getLedger(query: FinancialLedgerQuery): Promise<LedgerPage> {
    const cursor = query.cursor ? decodeLedgerCursor(query.cursor) : undefined;

    const rows = await financialRollupRepository.listLedger({
      paymentMethod: query.paymentMethod,
      brandPayoutStatus: query.brandPayoutStatus,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      cursor,
      limit: query.limit,
    });

    const hasMore = rows.length > query.limit;
    const entries = hasMore ? rows.slice(0, query.limit) : rows;
    const lastEntry = entries.at(-1);
    const nextCursor =
      hasMore && lastEntry
        ? encodeLedgerCursor({ createdAt: lastEntry.createdAt, orderItemId: lastEntry.orderItemId })
        : null;

    return { entries, nextCursor };
  },

  async exportLedgerCsv(query: FinancialLedgerExportQuery): Promise<{
    csv: string;
    rowCount: number;
  }> {
    const rows = await financialRollupRepository.listLedger({
      paymentMethod: query.paymentMethod,
      brandPayoutStatus: query.brandPayoutStatus,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: MAX_LEDGER_EXPORT_ROWS,
    });

    if (rows.length > MAX_LEDGER_EXPORT_ROWS) {
      throw new AppError(
        "LEDGER_EXPORT_TOO_LARGE",
        `This filter matches more than ${MAX_LEDGER_EXPORT_ROWS} rows — narrow the date range or filters before exporting.`,
        400,
      );
    }

    return { csv: toLedgerCsv(rows), rowCount: rows.length };
  },
};
