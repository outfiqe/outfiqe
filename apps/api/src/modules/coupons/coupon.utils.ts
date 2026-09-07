import { CouponEligibilityScopeType, CouponStatus } from "#generated/prisma/enums.js";
import type { DiscountableLine } from "#modules/discounts/discount.types.js";
import {
  allocatePlatformDiscountToLines,
  computeCouponValue,
} from "#modules/discounts/discount.utils.js";

import {
  COUPON_APPROVAL_BUDGET_THRESHOLD,
  COUPON_BUDGET_ALERT_THRESHOLDS_PERCENT,
} from "./coupon.constants.js";
import type {
  CouponEligibilityRow,
  CouponLine,
  CouponRecord,
  CouponValuation,
  CouponView,
  CouponWithEligibility,
} from "./coupon.types.js";

const FULL_PERCENT = 100;

export const isCouponWithinWindow = (coupon: CouponRecord, at: Date): boolean =>
  coupon.status === CouponStatus.ACTIVE &&
  coupon.startsAt <= at &&
  (coupon.endsAt === null || coupon.endsAt >= at);

export const lineMatchesEligibility = (
  line: Pick<CouponLine, "brandId" | "productId" | "productTypeId" | "categoryIds">,
  eligibility: CouponEligibilityRow[],
): boolean => {
  if (eligibility.length === 0) return true;
  return eligibility.some((row) => {
    if (row.scopeType === CouponEligibilityScopeType.BRAND) return row.scopeId === line.brandId;
    if (row.scopeType === CouponEligibilityScopeType.PRODUCT) return row.scopeId === line.productId;
    if (row.scopeType === CouponEligibilityScopeType.PRODUCT_TYPE) {
      return row.scopeId === line.productTypeId;
    }
    return line.categoryIds.includes(row.scopeId);
  });
};

export const resolveEligibleLines = (
  coupon: CouponWithEligibility,
  lines: CouponLine[],
): CouponLine[] =>
  lines.filter((line) => {
    if (!coupon.stacksWithBrandDiscount && line.hasBrandDiscount) return false;
    return lineMatchesEligibility(line, coupon.eligibility);
  });

export const valuateCoupon = (
  coupon: CouponRecord,
  eligibleLines: CouponLine[],
): CouponValuation => {
  const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + line.eligibleAmount, 0);
  const discountAmount = computeCouponValue(
    {
      type: coupon.type,
      percentBasisPoints: coupon.percentBasisPoints,
      fixedAmount: coupon.fixedAmount,
      maxDiscountAmount: coupon.maxDiscountAmount,
    },
    eligibleSubtotal,
  );

  const discountableLines: DiscountableLine[] = eligibleLines.map((line) => ({
    orderItemId: line.lineId,
    eligibleAmount: line.eligibleAmount,
  }));

  const allocations = allocatePlatformDiscountToLines(discountAmount, discountableLines).map(
    (allocation) => ({ lineId: allocation.orderItemId, discountAmount: allocation.discountAmount }),
  );

  return { discountAmount, allocations };
};

export const computeBudgetUtilizationPercent = (coupon: {
  spentAmount: number;
  totalBudgetAmount: number | null;
}): number | null =>
  coupon.totalBudgetAmount === null
    ? null
    : Math.floor((coupon.spentAmount * FULL_PERCENT) / coupon.totalBudgetAmount);

export const resolveCouponCreationState = (
  totalBudgetAmount: number | null,
): { status: CouponStatus; requiresApproval: boolean } =>
  totalBudgetAmount !== null && totalBudgetAmount > COUPON_APPROVAL_BUDGET_THRESHOLD
    ? { status: CouponStatus.PAUSED, requiresApproval: true }
    : { status: CouponStatus.ACTIVE, requiresApproval: false };

export const resolveCrossedBudgetThreshold = (
  utilizationPercent: number,
  lastAlertedThreshold: number | null,
): number | null => {
  const crossed = COUPON_BUDGET_ALERT_THRESHOLDS_PERCENT.filter(
    (threshold) => threshold <= utilizationPercent && threshold > (lastAlertedThreshold ?? 0),
  );
  return crossed.length > 0 ? Math.max(...crossed) : null;
};

export const toCouponView = (coupon: CouponWithEligibility): CouponView => ({
  id: coupon.id,
  code: coupon.code,
  type: coupon.type,
  percentBasisPoints: coupon.percentBasisPoints,
  fixedAmount: coupon.fixedAmount,
  maxDiscountAmount: coupon.maxDiscountAmount,
  minSubtotal: coupon.minSubtotal,
  startsAt: coupon.startsAt.toISOString(),
  endsAt: coupon.endsAt?.toISOString() ?? null,
  status: coupon.status,
  totalBudgetAmount: coupon.totalBudgetAmount,
  spentAmount: coupon.spentAmount,
  budgetUtilizationPercent: computeBudgetUtilizationPercent(coupon),
  maxRedemptions: coupon.maxRedemptions,
  redemptionCount: coupon.redemptionCount,
  firstOrderOnly: coupon.firstOrderOnly,
  prepaidOnly: coupon.prepaidOnly,
  stacksWithBrandDiscount: coupon.stacksWithBrandDiscount,
  requiresApproval: coupon.requiresApproval,
  approvedById: coupon.approvedById,
  approvedAt: coupon.approvedAt?.toISOString() ?? null,
  lastAlertedBudgetThreshold: coupon.lastAlertedBudgetThreshold,
  createdById: coupon.createdById,
  createdAt: coupon.createdAt.toISOString(),
  updatedAt: coupon.updatedAt.toISOString(),
  eligibility: coupon.eligibility,
});
