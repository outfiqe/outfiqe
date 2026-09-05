import { PaymentMethod } from "#generated/prisma/enums.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { couponRepository } from "./coupon.repository.js";
import type {
  CreateCouponBody,
  ListCouponsQuery,
  UpdateCouponStatusBody,
} from "./coupon.schemas.js";
import type {
  CouponLine,
  CouponValuation,
  CouponView,
  CouponWithEligibility,
} from "./coupon.types.js";
import {
  isCouponWithinWindow,
  resolveEligibleLines,
  toCouponView,
  valuateCoupon,
} from "./coupon.utils.js";

const NOT_FOUND_STATUS = 404;
const BAD_REQUEST_STATUS = 400;
const CONFLICT_STATUS = 409;

const REFUSAL_MESSAGES = {
  COUPON_NOT_FOUND: "We couldn't find that coupon code.",
  COUPON_NOT_ACTIVE: "This coupon isn't active right now.",
  COUPON_MIN_SUBTOTAL_NOT_MET: "Your order doesn't meet this coupon's minimum.",
  COUPON_ALREADY_USED: "You've already used this coupon.",
  COUPON_NOT_ELIGIBLE_FOR_ITEMS: "This coupon doesn't apply to the items in your bag.",
  COUPON_REQUIRES_PREPAID: "This coupon requires prepaid checkout (eSewa or Khalti).",
  COUPON_FIRST_ORDER_ONLY: "This coupon is only valid on your first order.",
  COUPON_EXHAUSTED: "This coupon has reached its limit.",
} as const;

export type CouponContext = {
  userId: string;
  paymentMethod: PaymentMethod | undefined;
  lines: CouponLine[];
  at: Date;
};

export const couponService = {
  async resolveForContext(
    code: string,
    context: CouponContext,
  ): Promise<{ coupon: CouponWithEligibility; valuation: CouponValuation }> {
    const coupon = await couponRepository.findByCode(code.trim().toUpperCase());
    if (!coupon) {
      throw new AppError("COUPON_NOT_FOUND", REFUSAL_MESSAGES.COUPON_NOT_FOUND, NOT_FOUND_STATUS);
    }
    if (!isCouponWithinWindow(coupon, context.at)) {
      throw new AppError(
        "COUPON_NOT_ACTIVE",
        REFUSAL_MESSAGES.COUPON_NOT_ACTIVE,
        BAD_REQUEST_STATUS,
      );
    }
    if (coupon.prepaidOnly && context.paymentMethod === PaymentMethod.COD) {
      throw new AppError(
        "COUPON_REQUIRES_PREPAID",
        REFUSAL_MESSAGES.COUPON_REQUIRES_PREPAID,
        BAD_REQUEST_STATUS,
      );
    }
    if (coupon.firstOrderOnly) {
      const priorOrderCount = await couponRepository.countOrdersForUser(context.userId);
      if (priorOrderCount > 0) {
        throw new AppError(
          "COUPON_FIRST_ORDER_ONLY",
          REFUSAL_MESSAGES.COUPON_FIRST_ORDER_ONLY,
          BAD_REQUEST_STATUS,
        );
      }
    }
    const existingRedemption = await couponRepository.findActiveRedemptionForUser(
      coupon.id,
      context.userId,
    );
    if (existingRedemption) {
      throw new AppError(
        "COUPON_ALREADY_USED",
        REFUSAL_MESSAGES.COUPON_ALREADY_USED,
        CONFLICT_STATUS,
      );
    }

    const orderSubtotal = context.lines.reduce((sum, line) => sum + line.eligibleAmount, 0);
    if (orderSubtotal < coupon.minSubtotal) {
      throw new AppError(
        "COUPON_MIN_SUBTOTAL_NOT_MET",
        REFUSAL_MESSAGES.COUPON_MIN_SUBTOTAL_NOT_MET,
        BAD_REQUEST_STATUS,
      );
    }

    const eligibleLines = resolveEligibleLines(coupon, context.lines);
    const valuation = valuateCoupon(coupon, eligibleLines);
    if (valuation.discountAmount <= 0) {
      throw new AppError(
        "COUPON_NOT_ELIGIBLE_FOR_ITEMS",
        REFUSAL_MESSAGES.COUPON_NOT_ELIGIBLE_FOR_ITEMS,
        BAD_REQUEST_STATUS,
      );
    }

    return { coupon, valuation };
  },

  async create(adminUserId: string, body: CreateCouponBody): Promise<CouponView> {
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
        totalBudgetAmount: body.totalBudgetAmount ?? null,
        maxRedemptions: body.maxRedemptions ?? null,
        firstOrderOnly: body.firstOrderOnly,
        prepaidOnly: body.prepaidOnly,
        stacksWithBrandDiscount: body.stacksWithBrandDiscount,
        createdById: adminUserId,
        eligibility: body.eligibility,
      });
      return toCouponView(coupon);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          "COUPON_CODE_ALREADY_EXISTS",
          "A coupon with this code already exists.",
          CONFLICT_STATUS,
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
      throw new AppError("COUPON_NOT_FOUND", REFUSAL_MESSAGES.COUPON_NOT_FOUND, NOT_FOUND_STATUS);
    return toCouponView(coupon);
  },

  async updateStatus(id: string, body: UpdateCouponStatusBody): Promise<CouponView> {
    const existing = await couponRepository.findById(id);
    if (!existing) {
      throw new AppError("COUPON_NOT_FOUND", REFUSAL_MESSAGES.COUPON_NOT_FOUND, NOT_FOUND_STATUS);
    }
    await couponRepository.updateStatus(id, body.status);
    const updated = await couponRepository.findById(id);
    return toCouponView(updated ?? { ...existing, status: body.status });
  },
};
