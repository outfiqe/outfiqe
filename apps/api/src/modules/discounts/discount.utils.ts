import { BASIS_POINTS_PER_PERCENT } from "#constants/money.constants.js";

import { MAX_BRAND_DISCOUNT_BASIS_POINTS, MIN_EFFECTIVE_PRICE } from "./discount.constants.js";
import type {
  ActiveBrandDiscount,
  AllocatedDiscount,
  CouponValueRule,
  DiscountableLine,
  OrderMoneyInvariantInput,
} from "./discount.types.js";

const BASIS_POINTS_DIVISOR = BASIS_POINTS_PER_PERCENT * 100;
const NO_ALLOCATION = 0;
const RUPEE_STEP = 1;
const DISCOUNT_PERCENT_MULTIPLIER = 100;

export const computeDiscountPercent = (listPrice: number, effectivePrice: number): number | null =>
  effectivePrice >= listPrice
    ? null
    : Math.round(((listPrice - effectivePrice) / listPrice) * DISCOUNT_PERCENT_MULTIPLIER);

export const toActiveBrandDiscount = (
  discount: ActiveBrandDiscount | null | undefined,
): ActiveBrandDiscount | null => {
  if (!discount) return null;
  return {
    discountType: discount.discountType,
    percentBasisPoints: discount.percentBasisPoints,
    fixedAmount: discount.fixedAmount,
  };
};

export const computeBrandDiscountAmount = (
  listPrice: number,
  activeDiscount: ActiveBrandDiscount,
): number =>
  activeDiscount.discountType === "PERCENT"
    ? Math.round((listPrice * (activeDiscount.percentBasisPoints ?? 0)) / BASIS_POINTS_DIVISOR)
    : (activeDiscount.fixedAmount ?? 0);

export const resolveBrandFundedUnitPrice = (
  listPrice: number,
  activeDiscount: ActiveBrandDiscount | null,
): number => {
  if (!activeDiscount) return listPrice;

  const discountAmount = computeBrandDiscountAmount(listPrice, activeDiscount);
  return Math.max(listPrice - discountAmount, MIN_EFFECTIVE_PRICE);
};

export const isBrandDiscountWithinCeiling = (
  listPrice: number,
  activeDiscount: ActiveBrandDiscount,
): boolean => {
  const discountAmount = computeBrandDiscountAmount(listPrice, activeDiscount);
  const maxAllowedAmount = Math.floor(
    (listPrice * MAX_BRAND_DISCOUNT_BASIS_POINTS) / BASIS_POINTS_DIVISOR,
  );
  return discountAmount <= maxAllowedAmount;
};

export const computeCouponValue = (rule: CouponValueRule, eligibleSubtotal: number): number => {
  const rawValue =
    rule.type === "PERCENT"
      ? Math.round((eligibleSubtotal * (rule.percentBasisPoints ?? 0)) / BASIS_POINTS_DIVISOR)
      : (rule.fixedAmount ?? 0);

  const cappedValue =
    rule.maxDiscountAmount === null ? rawValue : Math.min(rawValue, rule.maxDiscountAmount);

  return Math.min(Math.max(cappedValue, NO_ALLOCATION), eligibleSubtotal);
};

export const allocatePlatformDiscountToLines = (
  discountAmount: number,
  lines: DiscountableLine[],
): AllocatedDiscount[] => {
  const eligibleLines = lines.filter((line) => line.eligibleAmount > 0);
  const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + line.eligibleAmount, 0);

  if (discountAmount <= NO_ALLOCATION || eligibleSubtotal <= NO_ALLOCATION) {
    return lines.map((line) => ({ orderItemId: line.orderItemId, discountAmount: NO_ALLOCATION }));
  }

  const amountToAllocate = Math.min(discountAmount, eligibleSubtotal);

  const shares = eligibleLines.map((line) => {
    const exactShare = (amountToAllocate * line.eligibleAmount) / eligibleSubtotal;
    const flooredShare = Math.floor(exactShare);
    return {
      orderItemId: line.orderItemId,
      eligibleAmount: line.eligibleAmount,
      allocatedAmount: flooredShare,
      remainder: exactShare - flooredShare,
    };
  });

  let unallocatedRemainder =
    amountToAllocate - shares.reduce((sum, share) => sum + share.allocatedAmount, NO_ALLOCATION);

  const remainderPriorityOrder = [...shares].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    if (b.eligibleAmount !== a.eligibleAmount) return b.eligibleAmount - a.eligibleAmount;
    return a.orderItemId.localeCompare(b.orderItemId);
  });

  for (const share of remainderPriorityOrder) {
    if (unallocatedRemainder <= NO_ALLOCATION) break;
    share.allocatedAmount += RUPEE_STEP;
    unallocatedRemainder -= RUPEE_STEP;
  }

  const allocationByOrderItemId = new Map(
    shares.map((share) => [share.orderItemId, share.allocatedAmount]),
  );

  return lines.map((line) => ({
    orderItemId: line.orderItemId,
    discountAmount: allocationByOrderItemId.get(line.orderItemId) ?? NO_ALLOCATION,
  }));
};

export const assertOrderMoneyInvariant = (input: OrderMoneyInvariantInput): void => {
  const expectedTotal =
    input.subtotal - input.platformDiscountTotal + input.deliveryFee + input.codFee;
  if (expectedTotal !== input.total) {
    throw new Error(
      `Order money invariant violated: total ${input.total} does not equal ` +
        `subtotal ${input.subtotal} - platformDiscountTotal ${input.platformDiscountTotal} + ` +
        `deliveryFee ${input.deliveryFee} + codFee ${input.codFee} (expected ${expectedTotal}).`,
    );
  }

  const allocatedTotal = input.platformDiscountAllocations.reduce(
    (sum, amount) => sum + amount,
    NO_ALLOCATION,
  );
  if (allocatedTotal !== input.platformDiscountTotal) {
    throw new Error(
      `Order money invariant violated: sum of per-line platform discount allocations ` +
        `${allocatedTotal} does not equal platformDiscountTotal ${input.platformDiscountTotal}.`,
    );
  }
};
