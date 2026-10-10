import { HTTP_STATUS } from "#constants/http.constants.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { REFUSAL_MESSAGES } from "./coupon.constants.js";
import { couponRepository } from "./coupon.repository.js";
import type {
  CreateCouponBody,
  ListCouponsQuery,
  RedemptionSearchQuery,
  UpdateCouponBudgetBody,
  UpdateCouponStatusBody,
} from "./coupon.schemas.js";
import type {
  CouponPerformanceView,
  CouponRedemptionSearchRow,
  CouponView,
} from "./coupon.types.js";
import { resolveCouponCreationState, toCouponView } from "./coupon.utils.js";
import { couponRedemptionService } from "./redemption/redemption.service.js";

export const couponService = {
  async create(adminUserId: string, body: CreateCouponBody): Promise<CouponView> {
    const totalBudgetAmount = body.totalBudgetAmount ?? null;
    const { status, requiresApproval } = resolveCouponCreationState(totalBudgetAmount);

    try {
      const coupon = await couponRepository.create({
        code: body.code,
        type: body.type,
        percentBasisPoints: body.percentBasisPoints ?? null,
        fixedAmount: body.fixedAmount ?? null,
        maxDiscountAmount: body.maxDiscountAmount ?? null,
        minSubtotal: body.minSubtotal,
        startsAt: body.startsAt,
        endsAt: body.endsAt ?? null,
        status,
        totalBudgetAmount,
        maxRedemptions: body.maxRedemptions ?? null,
        firstOrderOnly: body.firstOrderOnly,
        prepaidOnly: body.prepaidOnly,
        stacksWithBrandDiscount: body.stacksWithBrandDiscount,
        requiresApproval,
        createdById: adminUserId,
        eligibility: body.eligibility,
      });

      if (requiresApproval) {
        await eventBus.publish(DomainEvents.COUPON_APPROVAL_REQUESTED, {
          couponId: coupon.id,
          code: coupon.code,
          createdById: adminUserId,
          totalBudgetAmount: coupon.totalBudgetAmount,
        });
      }

      return toCouponView(coupon);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          "COUPON_CODE_ALREADY_EXISTS",
          "A coupon with this code already exists.",
          HTTP_STATUS.CONFLICT,
        );
      }
      throw error;
    }
  },

  async list(
    query: ListCouponsQuery,
  ): Promise<{ coupons: CouponView[]; nextCursor: string | null }> {
    const rows = await couponRepository.list(query);
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const coupons = await Promise.all(
      page.map(async (row) => {
        const withEligibility = await couponRepository.findById(row.id);
        return toCouponView(withEligibility ?? { ...row, eligibility: [] });
      }),
    );
    return { coupons, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
  },

  async getById(id: string): Promise<CouponView> {
    const coupon = await couponRepository.findById(id);
    if (!coupon)
      throw new AppError(
        "COUPON_NOT_FOUND",
        REFUSAL_MESSAGES.COUPON_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );
    return toCouponView(coupon);
  },

  async updateStatus(id: string, body: UpdateCouponStatusBody): Promise<CouponView> {
    const existing = await couponRepository.findById(id);
    if (!existing) {
      throw new AppError(
        "COUPON_NOT_FOUND",
        REFUSAL_MESSAGES.COUPON_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );
    }
    if (existing.requiresApproval && existing.approvedById === null) {
      throw new AppError(
        "COUPON_APPROVAL_REQUIRED",
        "This coupon needs a second admin's approval before it can go active.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    await couponRepository.updateStatus(id, body.status);
    const updated = await couponRepository.findById(id);
    return toCouponView(updated ?? { ...existing, status: body.status });
  },

  async approve(id: string, adminId: string): Promise<CouponView> {
    const existing = await couponRepository.findById(id);
    if (!existing) {
      throw new AppError(
        "COUPON_NOT_FOUND",
        REFUSAL_MESSAGES.COUPON_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );
    }
    if (!existing.requiresApproval || existing.approvedById !== null) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This coupon doesn't need approval right now.",
        HTTP_STATUS.CONFLICT,
      );
    }
    if (existing.createdById === adminId) {
      throw new AppError(
        "SAME_ADMIN_SIGN_OFF",
        "Approval must come from a different admin than the one who created this coupon.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const approved = await couponRepository.approve(id, adminId);
    if (!approved) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This coupon can no longer be approved from its current state.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const coupon = await couponRepository.findById(id);
    if (!coupon) {
      throw new AppError(
        "COUPON_NOT_FOUND",
        REFUSAL_MESSAGES.COUPON_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );
    }
    return toCouponView(coupon);
  },

  async updateBudget(id: string, body: UpdateCouponBudgetBody): Promise<CouponView> {
    const existing = await couponRepository.findById(id);
    if (!existing) {
      throw new AppError(
        "COUPON_NOT_FOUND",
        REFUSAL_MESSAGES.COUPON_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );
    }

    const totalBudgetAmount = body.totalBudgetAmount ?? null;
    const maxRedemptions = body.maxRedemptions ?? null;
    const isBudgetRaised =
      totalBudgetAmount !== null &&
      (existing.totalBudgetAmount === null || totalBudgetAmount > existing.totalBudgetAmount);
    const { requiresApproval } = resolveCouponCreationState(totalBudgetAmount);

    await couponRepository.updateBudget(id, { totalBudgetAmount, maxRedemptions });

    if (!isBudgetRaised || !requiresApproval) {
      const coupon = await couponRepository.findById(id);
      if (!coupon) {
        throw new AppError(
          "COUPON_NOT_FOUND",
          REFUSAL_MESSAGES.COUPON_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
        );
      }
      return toCouponView(coupon);
    }

    const resetCoupon = await couponRepository.resetToPendingApproval(id);
    await eventBus.publish(DomainEvents.COUPON_APPROVAL_REQUESTED, {
      couponId: resetCoupon.id,
      code: resetCoupon.code,
      createdById: existing.createdById,
      totalBudgetAmount: resetCoupon.totalBudgetAmount,
    });
    return toCouponView(resetCoupon);
  },

  async getPerformance(id: string): Promise<CouponPerformanceView> {
    const coupon = await couponRepository.findById(id);
    if (!coupon) {
      throw new AppError(
        "COUPON_NOT_FOUND",
        REFUSAL_MESSAGES.COUPON_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );
    }
    return couponRepository.getPerformanceMetrics(id);
  },

  async searchRedemptions(
    query: RedemptionSearchQuery,
  ): Promise<{ redemptions: CouponRedemptionSearchRow[]; nextCursor: string | null }> {
    const rows = await couponRepository.searchRedemptions(query);
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    return { redemptions: page, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
  },

  ...couponRedemptionService,
};
