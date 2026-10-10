import { HTTP_STATUS } from "#constants/http.constants.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { PaymentMethod, ProductStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import {
  resolveBrandFundedUnitPrice,
  toActiveBrandDiscount,
} from "#modules/discounts/discount.utils.js";
import { productRepository } from "#modules/products/product.repository.js";

import {
  COUPON_BUDGET_AUTO_PAUSE_THRESHOLD_PERCENT,
  REFUSAL_MESSAGES,
  VELOCITY_REDEMPTION_THRESHOLD,
  VELOCITY_WINDOW_HOURS,
} from "../coupon.constants.js";
import { couponRepository } from "../coupon.repository.js";
import type { PreviewBuyNowCouponBody } from "../coupon.schemas.js";
import type { CouponLine, CouponValuation, CouponWithEligibility } from "../coupon.types.js";
import {
  computeBudgetUtilizationPercent,
  isCouponWithinWindow,
  resolveCrossedBudgetThreshold,
  resolveEligibleLines,
  valuateCoupon,
} from "../coupon.utils.js";

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

export type CouponContext = {
  userId: string;
  paymentMethod: PaymentMethod | undefined;
  lines: CouponLine[];
  at: Date;
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

export const couponRedemptionService = {
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

    const { coupon, valuation } = await couponRedemptionService.resolveForContext(body.code, {
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

  async afterRedemptionCommitted(context: {
    couponId: string;
    orderId: string;
    phone: string;
    address: string;
  }): Promise<void> {
    await Promise.all([checkBudgetAlerts(context.couponId), checkRedemptionVelocity(context)]);
  },
};
