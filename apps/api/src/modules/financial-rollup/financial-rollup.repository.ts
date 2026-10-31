import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { CommissionStatus, PaymentMethod } from "#generated/prisma/enums.js";
import {
  BrandPayoutStatus,
  CouponRedemptionStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from "#generated/prisma/enums.js";

import type {
  AttributionCounts,
  PaymentMethodOrderTotals,
  PaymentMethodPayoutFees,
} from "./financial-rollup.types.js";
import { financialRollupLedgerRepository } from "./ledger/ledger.repository.js";

export const financialRollupRepository = {
  ...financialRollupLedgerRepository,

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

  async sumAttributionCounts(since: Date | null): Promise<AttributionCounts> {
    const rows = await prisma.$queryRaw<AttributionCounts[]>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "totalItems",
        COUNT(oi.attributed_creator_id)::int AS "attributedItems"
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE EXISTS (
        SELECT 1 FROM payment_transactions pt
        WHERE pt.order_id = o.id
          AND pt.type = ${PaymentTransactionType.PAYMENT}
          AND pt.status = ${PaymentTransactionStatus.SUCCEEDED}
      )
      ${since ? Prisma.sql`AND oi.created_at >= ${since}` : Prisma.empty}
    `);
    return rows[0] ?? { totalItems: 0, attributedItems: 0 };
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
