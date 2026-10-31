import { millisecondsInDay } from "date-fns/constants";
import { startOfMonth } from "date-fns/startOfMonth";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { PaymentTransactionType } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";

import {
  MAX_LEDGER_EXPORT_ROWS,
  OUTSTANDING_BRAND_PAYOUT_STATUSES,
  OUTSTANDING_COMMISSION_STATUSES,
} from "./financial-rollup.constants.js";
import { financialRollupRepository } from "./financial-rollup.repository.js";
import type {
  FinancialLedgerExportQuery,
  FinancialLedgerQuery,
  FinancialRollupQuery,
} from "./financial-rollup.schemas.js";
import type {
  FinancialRollupRange,
  FinancialRollupView,
  LedgerPage,
} from "./financial-rollup.types.js";
import {
  buildAttributionView,
  buildPaymentMethodBreakdown,
  decodeLedgerCursor,
  encodeLedgerCursor,
  sumStatusBuckets,
  toLedgerCsv,
} from "./financial-rollup.utils.js";
import type { LedgerFilters, LedgerItemDetail } from "./ledger/ledger.repository.js";

const THIRTY_DAYS_MS = 30 * millisecondsInDay;

const resolveRangeStart = (range: FinancialRollupRange, now: Date): Date | null => {
  if (range === "all") return null;
  if (range === "30d") return new Date(now.getTime() - THIRTY_DAYS_MS);
  return startOfMonth(now);
};

const toLedgerMatchFilters = ({
  range,
  paymentMethod,
  brandPayoutStatus,
  commissionStatus,
  focus,
  search,
  dateFrom,
  dateTo,
}: FinancialLedgerExportQuery): Omit<LedgerFilters, "cursor" | "limit"> => ({
  paymentMethod,
  brandPayoutStatus,
  commissionStatus,
  focus,
  search,
  dateFrom: dateFrom ?? (range ? (resolveRangeStart(range, new Date()) ?? undefined) : undefined),
  dateTo,
});

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
      attributionCounts,
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
      financialRollupRepository.sumAttributionCounts(since),
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
      attribution: buildAttributionView(attributionCounts),
    };
  },

  async getLedger(query: FinancialLedgerQuery): Promise<LedgerPage> {
    const cursor = query.cursor ? decodeLedgerCursor(query.cursor) : undefined;
    const matchFilters = toLedgerMatchFilters(query);

    const [rows, totals] = await Promise.all([
      financialRollupRepository.listLedger({ ...matchFilters, cursor, limit: query.limit }),
      financialRollupRepository.sumLedger(matchFilters),
    ]);

    const hasMore = rows.length > query.limit;
    const entries = hasMore ? rows.slice(0, query.limit) : rows;
    const lastEntry = entries.at(-1);
    const nextCursor =
      hasMore && lastEntry
        ? encodeLedgerCursor({ createdAt: lastEntry.createdAt, orderItemId: lastEntry.orderItemId })
        : null;

    return { entries, nextCursor, totals };
  },

  async getLedgerItem(orderItemId: string): Promise<LedgerItemDetail> {
    const ledgerItem = await financialRollupRepository.findLedgerItem(orderItemId);
    if (!ledgerItem) {
      throw new AppError(
        "LEDGER_ITEM_NOT_FOUND",
        "That order item could not be found.",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    return ledgerItem;
  },

  async exportLedgerCsv(query: FinancialLedgerExportQuery): Promise<{
    csv: string;
    rowCount: number;
  }> {
    const rows = await financialRollupRepository.listLedger({
      ...toLedgerMatchFilters(query),
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
