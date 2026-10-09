import { HTTP_STATUS } from "#constants/http.constants.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { PaymentMethod, ProductStatus } from "#generated/prisma/enums.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import {
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "#modules/discounts/discount.utils.js";
import { productRepository } from "#modules/products/product.repository.js";

import {
  COUPON_BUDGET_AUTO_PAUSE_THRESHOLD_PERCENT,
  VELOCITY_REDEMPTION_THRESHOLD,
  VELOCITY_WINDOW_HOURS,
} from "./coupon.constants.js";
import { couponRepository } from "./coupon.repository.js";
import type {
  CreateCouponBody,
  ListCouponsQuery,
  PreviewBuyNowCouponBody,
  RedemptionSearchQuery,
  UpdateCouponBudgetBody,
  UpdateCouponStatusBody,
} from "./coupon.schemas.js";
import type {
  CouponLine,
  CouponPerformanceView,
  CouponRedemptionSearchRow,
  CouponValuation,
  CouponView,
  CouponWithEligibility,
} from "./coupon.types.js";
import {
  computeBudgetUtilizationPercent,
  isCouponWithinWindow,
  resolveCouponCreationState,
  resolveCrossedBudgetThreshold,
  resolveEligibleLines,
  toCouponView,
  valuateCoupon,
} from "./coupon.utils.js";

const MS_PER_HOUR = 60 * 60 * 1000;

export const buildCouponLinesForPricedLines = async (
  pricedLines: {
    productId: string;
    brandId: string;
    unitPrice: number;
    qty: number;
    brandDiscountAmount: number;
  }[],
): Promise<CouponLine[]> => {
  const eligibilityAttributesByProductId = await productRepository.findEligibilityAttributesByIds([
    ...new Set(pricedLines.map((line) => line.productId)),
  ]);

  return pricedLines.map((line, index) => {
    const attributes = eligibilityAttributesByProductId.get(line.productId);
    return {
      lineId: String(index),
      productId: line.productId,
      brandId: line.brandId,
      productTypeId: attributes?.productTypeId ?? "",
      categoryIds: attributes?.categoryIds ?? [],
      eligibleAmount: line.unitPrice * line.qty,
      hasBrandDiscount: line.brandDiscountAmount > 0,
    };
  });
};

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
      throw new AppError(
        "COUPON_NOT_FOUND",
        REFUSAL_MESSAGES.COUPON_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
      );
    }
    if (!isCouponWithinWindow(coupon, context.at)) {
      throw new AppError(
        "COUPON_NOT_ACTIVE",
        REFUSAL_MESSAGES.COUPON_NOT_ACTIVE,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    if (coupon.prepaidOnly && context.paymentMethod === PaymentMethod.COD) {
      throw new AppError(
        "COUPON_REQUIRES_PREPAID",
        REFUSAL_MESSAGES.COUPON_REQUIRES_PREPAID,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    if (coupon.firstOrderOnly) {
      const priorOrderCount = await couponRepository.countOrdersForUser(context.userId);
      if (priorOrderCount > 0) {
        throw new AppError(
          "COUPON_FIRST_ORDER_ONLY",
          REFUSAL_MESSAGES.COUPON_FIRST_ORDER_ONLY,
          HTTP_STATUS.BAD_REQUEST,
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
        HTTP_STATUS.CONFLICT,
      );
    }

    const orderSubtotal = context.lines.reduce((sum, line) => sum + line.eligibleAmount, 0);
    if (orderSubtotal < coupon.minSubtotal) {
      throw new AppError(
        "COUPON_MIN_SUBTOTAL_NOT_MET",
        REFUSAL_MESSAGES.COUPON_MIN_SUBTOTAL_NOT_MET,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const eligibleLines = resolveEligibleLines(coupon, context.lines);
    const valuation = valuateCoupon(coupon, eligibleLines);
    if (valuation.discountAmount <= 0) {
      throw new AppError(
        "COUPON_NOT_ELIGIBLE_FOR_ITEMS",
        REFUSAL_MESSAGES.COUPON_NOT_ELIGIBLE_FOR_ITEMS,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    return { coupon, valuation };
  },

  async previewForBuyNow(
    userId: string,
    body: PreviewBuyNowCouponBody,
  ): Promise<{ code: string; discountAmount: number; prepaidOnly: boolean }> {
    const product = await productRepository.findById(body.productId);
    if (!product || product.status !== ProductStatus.APPROVED || product.deletedAt) {
      throw new AppError(
        "NOT_FOUND",
        "This product is no longer available.",
        HTTP_STATUS.NOT_FOUND,
      );
    }

    const activeDiscountsByProductId = await productRepository.findActiveDiscountsByProductIds(
      [body.productId],
      new Date(),
    );
    const activeDiscount = activeDiscountsByProductId.get(body.productId);
    const unitPrice = resolveBrandFundedUnitPrice(
      product.price,
      toActiveBrandDiscount(activeDiscount),
    );

    const lines = await buildCouponLinesForPricedLines([
      {
        productId: body.productId,
        brandId: product.brandId,
        unitPrice,
        qty: body.qty,
        brandDiscountAmount: product.price - unitPrice,
      },
    ]);

    const { coupon, valuation } = await couponService.resolveForContext(body.code, {
      userId,
      paymentMethod: undefined,
      lines,
      at: new Date(),
    });

    return {
      code: coupon.code,
      discountAmount: valuation.discountAmount,
      prepaidOnly: coupon.prepaidOnly,
    };
  },

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

  async afterRedemptionCommitted(context: {
    couponId: string;
    orderId: string;
    phone: string;
    address: string;
  }): Promise<void> {
    await Promise.all([checkBudgetAlerts(context.couponId), checkRedemptionVelocity(context)]);
  },
};

const checkBudgetAlerts = async (couponId: string): Promise<void> => {
  const coupon = await couponRepository.findById(couponId);
  if (!coupon || coupon.totalBudgetAmount === null) return;

  const utilizationPercent = computeBudgetUtilizationPercent(coupon) ?? 0;
  const crossedThreshold = resolveCrossedBudgetThreshold(
    utilizationPercent,
    coupon.lastAlertedBudgetThreshold,
  );

  if (crossedThreshold !== null) {
    const claimed = await couponRepository.claimBudgetAlertThreshold(couponId, crossedThreshold);
    if (claimed) {
      await eventBus.publish(DomainEvents.COUPON_BUDGET_ALERT, {
        couponId: coupon.id,
        code: coupon.code,
        thresholdPercent: crossedThreshold,
        spentAmount: coupon.spentAmount,
        totalBudgetAmount: coupon.totalBudgetAmount,
      });
    }
  }

  if (utilizationPercent >= COUPON_BUDGET_AUTO_PAUSE_THRESHOLD_PERCENT) {
    await couponRepository.autoPause(couponId);
  }
};

const checkRedemptionVelocity = async (context: {
  orderId: string;
  phone: string;
  address: string;
}): Promise<void> => {
  const since = new Date(Date.now() - VELOCITY_WINDOW_HOURS * MS_PER_HOUR);
  const recentCount = await couponRepository.countRecentRedemptionsForContact(
    context.phone,
    context.address,
    since,
    context.orderId,
  );
  if (recentCount < VELOCITY_REDEMPTION_THRESHOLD) return;

  const redemption = await couponRepository.findRedemptionByOrderId(context.orderId);
  if (!redemption || redemption.flaggedForReview) return;

  const flagReason = `${recentCount} other coupon redemptions shared this phone or delivery address in the last ${VELOCITY_WINDOW_HOURS}h`;
  await couponRepository.flagRedemptionForReview(redemption.id, flagReason);
  await eventBus.publish(DomainEvents.COUPON_REDEMPTION_FLAGGED, {
    redemptionId: redemption.id,
    couponId: redemption.couponId,
    orderId: context.orderId,
    flagReason,
  });
};
