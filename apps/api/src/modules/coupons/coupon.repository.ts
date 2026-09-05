import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { CouponRedemptionStatus, type CouponStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type {
  CouponRecord,
  CouponRedemptionRecord,
  CouponWithEligibility,
  CreateCouponInput,
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

  async list(params: { cursor?: string; limit: number }): Promise<CouponRecord[]> {
    return prisma.coupon.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
  },

  async updateStatus(id: string, status: CouponStatus): Promise<CouponRecord> {
    return prisma.coupon.update({ where: { id }, data: { status } });
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
    client: DbClient,
    orderId: string,
  ): Promise<CouponRedemptionRecord | null> {
    return client.couponRedemption.findUnique({ where: { orderId } });
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
};
