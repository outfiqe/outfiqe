import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type {
  CommissionStatus,
  PaymentMethod,
  PaymentTransactionType,
} from "#generated/prisma/enums.js";
import {
  BrandPayoutStatus,
  CouponRedemptionStatus,
  PaymentTransactionStatus,
} from "#generated/prisma/enums.js";

import type {
  LedgerRow,
  PaymentMethodOrderTotals,
  PaymentMethodPayoutFees,
} from "./financialRollup.types.js";

export type LedgerFilters = {
  paymentMethod?: PaymentMethod;
  brandPayoutStatus?: BrandPayoutStatus;
  dateFrom?: Date;
  dateTo?: Date;
  cursor?: { createdAt: Date; orderItemId: string };
  limit: number;
};

export const financialRollupRepository = {
  async sumOrderTotalsForTransactionType(
    type: PaymentTransactionType,
    since: Date | null,
  ): Promise<number> {
    const rows = await prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
      SELECT COALESCE(SUM(o.total), 0)::int AS total
      FROM payment_transactions pt
      JOIN orders o ON o.id = pt.order_id
      WHERE pt.type = ${type}
        AND pt.status = ${PaymentTransactionStatus.SUCCEEDED}
        ${since ? Prisma.sql`AND pt.created_at >= ${since}` : Prisma.empty}
    `);
    return rows[0]?.total ?? 0;
  },

  async sumOrderTotalsByPaymentMethod(
    type: PaymentTransactionType,
    since: Date | null,
  ): Promise<PaymentMethodOrderTotals[]> {
    return prisma.$queryRaw<PaymentMethodOrderTotals[]>(Prisma.sql`
      SELECT
        o.payment_method AS "paymentMethod",
        COALESCE(SUM(o.total), 0)::int AS total,
        COUNT(*)::int AS "orderCount"
      FROM payment_transactions pt
      JOIN orders o ON o.id = pt.order_id
      WHERE pt.type = ${type}
        AND pt.status = ${PaymentTransactionStatus.SUCCEEDED}
        ${since ? Prisma.sql`AND pt.created_at >= ${since}` : Prisma.empty}
      GROUP BY o.payment_method
    `);
  },

  async sumRealizedBrandPayoutFeesByPaymentMethod(
    since: Date | null,
  ): Promise<PaymentMethodPayoutFees[]> {
    return prisma.$queryRaw<PaymentMethodPayoutFees[]>(Prisma.sql`
      SELECT
        o.payment_method AS "paymentMethod",
        COALESCE(SUM(bp.platform_fee), 0)::int AS "platformFee",
        COALESCE(SUM(bp.gateway_fee), 0)::int AS "gatewayFee"
      FROM brand_payouts bp
      JOIN order_items oi ON oi.id = bp.order_item_id
      JOIN orders o ON o.id = oi.order_id
      WHERE bp.status = ${BrandPayoutStatus.WITHDRAWN}
        ${since ? Prisma.sql`AND bp.created_at >= ${since}` : Prisma.empty}
      GROUP BY o.payment_method
    `);
  },

  async sumCreatorCommissionsByStatus(
    since: Date | null,
  ): Promise<Partial<Record<CommissionStatus, number>>> {
    const grouped = await prisma.creatorCommission.groupBy({
      by: ["status"],
      where: since ? { createdAt: { gte: since } } : undefined,
      _sum: { amount: true },
    });

    const sums: Partial<Record<CommissionStatus, number>> = {};
    for (const { status, _sum } of grouped) {
      sums[status] = _sum.amount ?? 0;
    }
    return sums;
  },

  async sumBrandPayoutsByStatus(
    since: Date | null,
  ): Promise<Partial<Record<BrandPayoutStatus, number>>> {
    const grouped = await prisma.brandPayout.groupBy({
      by: ["status"],
      where: since ? { createdAt: { gte: since } } : undefined,
      _sum: { netAmount: true },
    });

    const sums: Partial<Record<BrandPayoutStatus, number>> = {};
    for (const { status, _sum } of grouped) {
      sums[status] = _sum.netAmount ?? 0;
    }
    return sums;
  },

  async sumRealizedPlatformFee(since: Date | null): Promise<number> {
    const result = await prisma.brandPayout.aggregate({
      where: {
        status: BrandPayoutStatus.WITHDRAWN,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      _sum: { platformFee: true },
    });
    return result._sum.platformFee ?? 0;
  },

  async listLedger({
    paymentMethod,
    brandPayoutStatus,
    dateFrom,
    dateTo,
    cursor,
    limit,
  }: LedgerFilters): Promise<LedgerRow[]> {
    return prisma.$queryRaw<LedgerRow[]>(Prisma.sql`
      SELECT
        o.id AS "orderId",
        oi.id AS "orderItemId",
        oi.created_at AS "createdAt",
        o.payment_method AS "paymentMethod",
        bp.gross_amount AS "grossAmount",
        bp.platform_fee AS "platformFee",
        bp.gateway_fee AS "gatewayFee",
        bp.net_amount AS "brandNetAmount",
        bp.status AS "brandPayoutStatus",
        cc.amount AS "creatorCommissionAmount",
        cc.status AS "creatorCommissionStatus"
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      LEFT JOIN brand_payouts bp ON bp.order_item_id = oi.id
      LEFT JOIN creator_commissions cc ON cc.order_item_id = oi.id
      WHERE 1 = 1
        ${paymentMethod ? Prisma.sql`AND o.payment_method = ${paymentMethod}` : Prisma.empty}
        ${brandPayoutStatus ? Prisma.sql`AND bp.status = ${brandPayoutStatus}` : Prisma.empty}
        ${dateFrom ? Prisma.sql`AND oi.created_at >= ${dateFrom}` : Prisma.empty}
        ${dateTo ? Prisma.sql`AND oi.created_at <= ${dateTo}` : Prisma.empty}
        ${
          cursor
            ? Prisma.sql`AND (oi.created_at, oi.id) < (${cursor.createdAt}, ${cursor.orderItemId})`
            : Prisma.empty
        }
      ORDER BY oi.created_at DESC, oi.id DESC
      LIMIT ${limit + 1}
    `);
  },

  async sumCouponSpend(since: Date | null): Promise<number> {
    const result = await prisma.couponRedemption.aggregate({
      where: {
        status: { not: CouponRedemptionStatus.RELEASED },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      _sum: { platformFundedAmount: true },
    });
    return result._sum.platformFundedAmount ?? 0;
  },
};
