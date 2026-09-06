import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { CouponRedemptionStatus, CouponStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type {
  CouponPerformanceView,
  CouponRecord,
  CouponRedemptionRecord,
  CouponRedemptionSearchFilters,
  CouponRedemptionSearchRow,
  CouponWithEligibility,
  CreateCouponInput,
  UpdateCouponBudgetInput,
} from "./coupon.types.js";

export const couponRepository = {
  async create(input: CreateCouponInput): Promise<CouponWithEligibility> {
    const { eligibility, ...rest } = input;
    return prisma.coupon.create({
      data: {
        ...rest,
        eligibility: eligibility.length > 0 ? { create: eligibility } : undefined,
      },
      include: { eligibility: true },
    });
  },

  async findByCode(code: string): Promise<CouponWithEligibility | null> {
    return prisma.coupon.findUnique({ where: { code }, include: { eligibility: true } });
  },

  async findById(id: string): Promise<CouponWithEligibility | null> {
    return prisma.coupon.findUnique({ where: { id }, include: { eligibility: true } });
  },

  async list(params: {
    status?: CouponStatus;
    cursor?: string;
    limit: number;
  }): Promise<CouponRecord[]> {
    return prisma.coupon.findMany({
      where: params.status ? { status: params.status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
  },

  async updateStatus(id: string, status: CouponStatus): Promise<CouponRecord> {
    return prisma.coupon.update({ where: { id }, data: { status } });
  },

  async updateBudget(id: string, input: UpdateCouponBudgetInput): Promise<CouponWithEligibility> {
    return prisma.coupon.update({
      where: { id },
      data: input,
      include: { eligibility: true },
    });
  },

  async resetToPendingApproval(id: string): Promise<CouponWithEligibility> {
    return prisma.coupon.update({
      where: { id },
      data: {
        status: CouponStatus.PAUSED,
        requiresApproval: true,
        approvedById: null,
        approvedAt: null,
      },
      include: { eligibility: true },
    });
  },

  async approve(id: string, adminId: string): Promise<boolean> {
    const result = await prisma.coupon.updateMany({
      where: {
        id,
        requiresApproval: true,
        approvedById: null,
        createdById: { not: adminId },
      },
      data: {
        approvedById: adminId,
        approvedAt: new Date(),
        status: CouponStatus.ACTIVE,
      },
    });
    return result.count > 0;
  },

  async claimBudgetAlertThreshold(couponId: string, threshold: number): Promise<boolean> {
    const affectedRows = await prisma.$executeRaw(Prisma.sql`
      UPDATE coupons
      SET last_alerted_budget_threshold = ${threshold}
      WHERE id = ${couponId}::uuid
        AND (last_alerted_budget_threshold IS NULL OR last_alerted_budget_threshold < ${threshold})
    `);
    return affectedRows > 0;
  },

  async autoPause(couponId: string): Promise<boolean> {
    const result = await prisma.coupon.updateMany({
      where: { id: couponId, status: CouponStatus.ACTIVE },
      data: { status: CouponStatus.PAUSED },
    });
    return result.count > 0;
  },

  async findActiveRedemptionForUser(
    couponId: string,
    userId: string,
    client: DbClient = prisma,
  ): Promise<CouponRedemptionRecord | null> {
    return client.couponRedemption.findFirst({
      where: { couponId, userId, status: { not: CouponRedemptionStatus.RELEASED } },
    });
  },

  async countOrdersForUser(userId: string): Promise<number> {
    return prisma.order.count({ where: { userId } });
  },

  async claimBudget(client: DbClient, couponId: string, amount: number): Promise<boolean> {
    const affectedRows = await client.$executeRaw(Prisma.sql`
      UPDATE coupons
      SET spent_amount = spent_amount + ${amount},
          redemption_count = redemption_count + 1
      WHERE id = ${couponId}::uuid
        AND status = 'ACTIVE'
        AND (total_budget_amount IS NULL OR spent_amount + ${amount} <= total_budget_amount)
        AND (max_redemptions IS NULL OR redemption_count + 1 <= max_redemptions)
    `);
    return affectedRows > 0;
  },

  async releaseBudget(client: DbClient, couponId: string, amount: number): Promise<void> {
    await client.coupon.update({
      where: { id: couponId },
      data: { spentAmount: { decrement: amount }, redemptionCount: { decrement: 1 } },
    });
  },

  async createRedemption(
    client: DbClient,
    input: {
      couponId: string;
      userId: string;
      orderId: string;
      discountAmount: number;
      platformFundedAmount: number;
    },
  ): Promise<CouponRedemptionRecord> {
    return client.couponRedemption.create({ data: input });
  },

  async findRedemptionByOrderId(
    orderId: string,
    client: DbClient = prisma,
  ): Promise<CouponRedemptionRecord | null> {
    return client.couponRedemption.findUnique({ where: { orderId } });
  },

  async countRecentRedemptionsForContact(
    phone: string,
    address: string,
    since: Date,
    excludeOrderId: string,
  ): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT cr.id)::int AS count
      FROM coupon_redemptions cr
      JOIN orders o ON o.id = cr.order_id
      WHERE cr.status <> 'RELEASED'
        AND cr.created_at >= ${since}
        AND cr.order_id <> ${excludeOrderId}::uuid
        AND (o.phone = ${phone} OR o.address = ${address})
    `);
    return rows[0]?.count ?? 0;
  },

  async flagRedemptionForReview(id: string, reason: string): Promise<void> {
    await prisma.couponRedemption.update({
      where: { id },
      data: { flaggedForReview: true, flagReason: reason },
    });
  },

  async markRedemptionReleased(
    client: DbClient,
    id: string,
    status: CouponRedemptionStatus,
    reason: string,
  ): Promise<void> {
    await client.couponRedemption.update({
      where: { id },
      data: { status, releasedAt: new Date(), releasedReason: reason },
    });
  },

  async getPerformanceMetrics(couponId: string): Promise<CouponPerformanceView> {
    const rows = await prisma.$queryRaw<
      {
        redemptionCount: number;
        totalDiscountAmount: number;
        totalPlatformFundedAmount: number;
        totalGmv: number;
        totalPlatformFeeCollected: number;
        newCustomerCount: number;
        returningCustomerCount: number;
        repeatPurchaseWithin30dCount: number;
        repeatPurchaseWithin90dCount: number;
      }[]
    >(Prisma.sql`
      WITH redemptions AS (
        SELECT cr.id, cr.order_id, cr.user_id, cr.discount_amount, cr.platform_funded_amount,
               o.subtotal, o.created_at
        FROM coupon_redemptions cr
        JOIN orders o ON o.id = cr.order_id
        WHERE cr.coupon_id = ${couponId}::uuid AND cr.status <> 'RELEASED'
      ),
      order_platform_fees AS (
        SELECT r.order_id, COALESCE(SUM(bp.platform_fee), 0) AS platform_fee
        FROM redemptions r
        JOIN order_items oi ON oi.order_id = r.order_id
        LEFT JOIN brand_payouts bp ON bp.order_item_id = oi.id
        GROUP BY r.order_id
      ),
      customer_history AS (
        SELECT r.id,
          EXISTS (
            SELECT 1 FROM orders o2 WHERE o2.user_id = r.user_id AND o2.created_at < r.created_at
          ) AS is_returning
        FROM redemptions r
      )
      SELECT
        COUNT(*)::int AS "redemptionCount",
        COALESCE(SUM(r.discount_amount), 0)::int AS "totalDiscountAmount",
        COALESCE(SUM(r.platform_funded_amount), 0)::int AS "totalPlatformFundedAmount",
        COALESCE(SUM(r.subtotal), 0)::int AS "totalGmv",
        COALESCE((SELECT SUM(platform_fee) FROM order_platform_fees), 0)::int AS "totalPlatformFeeCollected",
        COALESCE((SELECT COUNT(*) FROM customer_history WHERE NOT is_returning), 0)::int AS "newCustomerCount",
        COALESCE((SELECT COUNT(*) FROM customer_history WHERE is_returning), 0)::int AS "returningCustomerCount",
        COALESCE((
          SELECT COUNT(DISTINCT r2.user_id) FROM redemptions r2
          WHERE EXISTS (
            SELECT 1 FROM orders o3
            WHERE o3.user_id = r2.user_id AND o3.id <> r2.order_id
              AND o3.created_at > r2.created_at AND o3.created_at <= r2.created_at + INTERVAL '30 days'
          )
        ), 0)::int AS "repeatPurchaseWithin30dCount",
        COALESCE((
          SELECT COUNT(DISTINCT r3.user_id) FROM redemptions r3
          WHERE EXISTS (
            SELECT 1 FROM orders o4
            WHERE o4.user_id = r3.user_id AND o4.id <> r3.order_id
              AND o4.created_at > r3.created_at AND o4.created_at <= r3.created_at + INTERVAL '90 days'
          )
        ), 0)::int AS "repeatPurchaseWithin90dCount"
      FROM redemptions r
    `);

    const metrics = rows[0] ?? {
      redemptionCount: 0,
      totalDiscountAmount: 0,
      totalPlatformFundedAmount: 0,
      totalGmv: 0,
      totalPlatformFeeCollected: 0,
      newCustomerCount: 0,
      returningCustomerCount: 0,
      repeatPurchaseWithin30dCount: 0,
      repeatPurchaseWithin90dCount: 0,
    };

    return {
      couponId,
      ...metrics,
      netMargin: metrics.totalPlatformFeeCollected - metrics.totalPlatformFundedAmount,
    };
  },

  async searchRedemptions(
    filters: CouponRedemptionSearchFilters,
  ): Promise<CouponRedemptionSearchRow[]> {
    const rows = await prisma.couponRedemption.findMany({
      where: {
        userId: filters.userId,
        orderId: filters.orderId,
        coupon: filters.code ? { code: filters.code.trim().toUpperCase() } : undefined,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: filters.limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      include: { coupon: { select: { code: true } }, user: { select: { email: true } } },
    });

    return rows.map(({ coupon, user, ...redemption }) => ({
      ...redemption,
      couponCode: coupon.code,
      userEmail: user.email,
    }));
  },
};
