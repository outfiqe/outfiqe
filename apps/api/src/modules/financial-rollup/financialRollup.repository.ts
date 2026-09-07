import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { CommissionStatus, PaymentTransactionType } from "#generated/prisma/enums.js";
import {
  BrandPayoutStatus,
  CouponRedemptionStatus,
  PaymentTransactionStatus,
} from "#generated/prisma/enums.js";

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
