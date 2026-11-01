import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { PaymentMethod } from "#generated/prisma/enums.js";
import {
  BrandPayoutStatus,
  CommissionStatus,
  CouponRedemptionStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from "#generated/prisma/enums.js";

import {
  OUTSTANDING_BRAND_PAYOUT_STATUSES,
  OUTSTANDING_COMMISSION_STATUSES,
} from "./financial-rollup.constants.js";
import type {
  AttributionCounts,
  PaidOrderMoneyTotals,
  PaymentMethodOrderTotals,
  PaymentMethodPayoutFees,
} from "./financial-rollup.types.js";
import { financialRollupLedgerRepository } from "./ledger/ledger.repository.js";

const EMPTY_PAID_ORDER_MONEY: PaidOrderMoneyTotals = {
  collected: 0,
  refunded: 0,
  orderFees: 0,
  couponSpend: 0,
  brandsOwed: 0,
  brandsPaid: 0,
  platformFees: 0,
  gatewayFees: 0,
  cancelledItems: 0,
  musesOwed: 0,
  musesPaid: 0,
};

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

  async sumPaidOrderMoney(since: Date | null): Promise<PaidOrderMoneyTotals> {
    const [paidOrderMoney] = await prisma.$queryRaw<PaidOrderMoneyTotals[]>(Prisma.sql`
      WITH paid_orders AS (
        SELECT DISTINCT o.id, o.total, o.delivery_fee, o.cod_fee, o.platform_discount_total
        FROM payment_transactions pt
        JOIN orders o ON o.id = pt.order_id
        WHERE pt.type = ${PaymentTransactionType.PAYMENT}
          AND pt.status = ${PaymentTransactionStatus.SUCCEEDED}
          ${since ? Prisma.sql`AND pt.created_at >= ${since}` : Prisma.empty}
      ),
      order_money AS (
        SELECT
          COALESCE(SUM(total), 0)::int AS collected,
          COALESCE(SUM(delivery_fee + cod_fee), 0)::int AS "orderFees",
          COALESCE(SUM(platform_discount_total), 0)::int AS "couponSpend"
        FROM paid_orders
      ),
      refund_money AS (
        SELECT COALESCE(SUM(COALESCE(pt.amount, po.total)), 0)::int AS refunded
        FROM payment_transactions pt
        JOIN paid_orders po ON po.id = pt.order_id
        WHERE pt.type = ${PaymentTransactionType.REFUND}
          AND pt.status = ${PaymentTransactionStatus.SUCCEEDED}
      ),
      payout_money AS (
        SELECT
          COALESCE(SUM(bp.net_amount) FILTER (
            WHERE bp.status::text IN (${Prisma.join([...OUTSTANDING_BRAND_PAYOUT_STATUSES])})
          ), 0)::int AS "brandsOwed",
          COALESCE(SUM(bp.net_amount) FILTER (
            WHERE bp.status = ${BrandPayoutStatus.WITHDRAWN}
          ), 0)::int AS "brandsPaid",
          COALESCE(SUM(bp.platform_fee) FILTER (
            WHERE bp.status <> ${BrandPayoutStatus.VOIDED}
          ), 0)::int AS "platformFees",
          COALESCE(SUM(bp.gateway_fee) FILTER (
            WHERE bp.status <> ${BrandPayoutStatus.VOIDED}
          ), 0)::int AS "gatewayFees",
          COALESCE(SUM(bp.gross_amount) FILTER (
            WHERE bp.status = ${BrandPayoutStatus.VOIDED}
          ), 0)::int AS "cancelledItems"
        FROM brand_payouts bp
        JOIN order_items oi ON oi.id = bp.order_item_id
        JOIN paid_orders po ON po.id = oi.order_id
      ),
      commission_money AS (
        SELECT
          COALESCE(SUM(cc.amount) FILTER (
            WHERE cc.status::text IN (${Prisma.join([...OUTSTANDING_COMMISSION_STATUSES])})
          ), 0)::int AS "musesOwed",
          COALESCE(SUM(cc.amount) FILTER (
            WHERE cc.status = ${CommissionStatus.PAID}
          ), 0)::int AS "musesPaid"
        FROM creator_commissions cc
        JOIN order_items oi ON oi.id = cc.order_item_id
        JOIN paid_orders po ON po.id = oi.order_id
      )
      SELECT *
      FROM order_money, refund_money, payout_money, commission_money
    `);
    return paidOrderMoney ?? EMPTY_PAID_ORDER_MONEY;
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
