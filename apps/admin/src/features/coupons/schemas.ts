import { z } from "zod";

const couponTypeValues = ["PERCENT", "FIXED"] as const;
export const couponTypeSchema = z.enum(couponTypeValues);
export type CouponTypeValue = z.infer<typeof couponTypeSchema>;

const couponStatusValues = ["ACTIVE", "PAUSED", "ARCHIVED"] as const;
export const couponStatusSchema = z.enum(couponStatusValues);
export type CouponStatusValue = z.infer<typeof couponStatusSchema>;

const couponEligibilityScopeTypeValues = ["BRAND", "CATEGORY", "PRODUCT", "PRODUCT_TYPE"] as const;
export const couponEligibilitySchema = z.object({
  scopeType: z.enum(couponEligibilityScopeTypeValues),
  scopeId: z.string(),
});
export type CouponEligibility = z.infer<typeof couponEligibilitySchema>;

export const couponSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: couponTypeSchema,
  percentBasisPoints: z.number().nullable(),
  fixedAmount: z.number().nullable(),
  maxDiscountAmount: z.number().nullable(),
  minSubtotal: z.number(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  status: couponStatusSchema,
  totalBudgetAmount: z.number().nullable(),
  spentAmount: z.number(),
  budgetUtilizationPercent: z.number().nullable(),
  maxRedemptions: z.number().nullable(),
  redemptionCount: z.number(),
  firstOrderOnly: z.boolean(),
  prepaidOnly: z.boolean(),
  stacksWithBrandDiscount: z.boolean(),
  requiresApproval: z.boolean(),
  approvedById: z.string().nullable(),
  approvedAt: z.string().nullable(),
  lastAlertedBudgetThreshold: z.number().nullable(),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  eligibility: z.array(couponEligibilitySchema),
});
export type Coupon = z.infer<typeof couponSchema>;

export const couponPageSchema = z.object({
  coupons: z.array(couponSchema),
  nextCursor: z.string().nullable(),
});
export type CouponPage = z.infer<typeof couponPageSchema>;

export const couponPerformanceSchema = z.object({
  couponId: z.string(),
  redemptionCount: z.number(),
  totalDiscountAmount: z.number(),
  totalPlatformFundedAmount: z.number(),
  totalGmv: z.number(),
  totalPlatformFeeCollected: z.number(),
  netMargin: z.number(),
  newCustomerCount: z.number(),
  returningCustomerCount: z.number(),
  repeatPurchaseWithin30dCount: z.number(),
  repeatPurchaseWithin90dCount: z.number(),
});
export type CouponPerformance = z.infer<typeof couponPerformanceSchema>;

const couponRedemptionStatusValues = ["CONSUMED", "RELEASED"] as const;
export const couponRedemptionSchema = z.object({
  id: z.string(),
  couponId: z.string(),
  couponCode: z.string(),
  userId: z.string(),
  userEmail: z.string(),
  orderId: z.string(),
  discountAmount: z.number(),
  platformFundedAmount: z.number(),
  brandFundedAmount: z.number(),
  status: z.enum(couponRedemptionStatusValues),
  releasedAt: z.string().nullable(),
  releasedReason: z.string().nullable(),
  createdAt: z.string(),
});
export type CouponRedemption = z.infer<typeof couponRedemptionSchema>;

export const couponRedemptionPageSchema = z.object({
  redemptions: z.array(couponRedemptionSchema),
  nextCursor: z.string().nullable(),
});
export type CouponRedemptionPage = z.infer<typeof couponRedemptionPageSchema>;

export type CreateCouponInput = {
  code: string;
  type: CouponTypeValue;
  percentBasisPoints?: number;
  fixedAmount?: number;
  maxDiscountAmount?: number;
  minSubtotal: number;
  startsAt: string;
  endsAt?: string | null;
  totalBudgetAmount?: number;
  maxRedemptions?: number;
  firstOrderOnly: boolean;
  prepaidOnly: boolean;
  stacksWithBrandDiscount: boolean;
};

export type UpdateCouponBudgetInput = {
  totalBudgetAmount: number | null;
  maxRedemptions: number | null;
};
