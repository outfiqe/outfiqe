import type {
  CouponEligibilityScopeType,
  CouponRedemptionStatus,
  CouponStatus,
  CouponType,
} from "#generated/prisma/enums.js";

export type CouponRecord = {
  id: string;
  code: string;
  type: CouponType;
  percentBasisPoints: number | null;
  fixedAmount: number | null;
  maxDiscountAmount: number | null;
  minSubtotal: number;
  startsAt: Date;
  endsAt: Date | null;
  status: CouponStatus;
  totalBudgetAmount: number | null;
  spentAmount: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  firstOrderOnly: boolean;
  prepaidOnly: boolean;
  stacksWithBrandDiscount: boolean;
  requiresApproval: boolean;
  approvedById: string | null;
  approvedAt: Date | null;
  lastAlertedBudgetThreshold: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CouponEligibilityRow = {
  scopeType: CouponEligibilityScopeType;
  scopeId: string;
};

export type CouponWithEligibility = CouponRecord & { eligibility: CouponEligibilityRow[] };

export type CouponView = Omit<
  CouponRecord,
  "startsAt" | "endsAt" | "approvedAt" | "createdAt" | "updatedAt"
> & {
  startsAt: string;
  endsAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  budgetUtilizationPercent: number | null;
  eligibility: CouponEligibilityRow[];
};

export type CreateCouponInput = {
  code: string;
  type: CouponType;
  percentBasisPoints: number | null;
  fixedAmount: number | null;
  maxDiscountAmount: number | null;
  minSubtotal: number;
  startsAt: Date;
  endsAt: Date | null;
  status: CouponStatus;
  totalBudgetAmount: number | null;
  maxRedemptions: number | null;
  firstOrderOnly: boolean;
  prepaidOnly: boolean;
  stacksWithBrandDiscount: boolean;
  requiresApproval: boolean;
  createdById: string;
  eligibility: CouponEligibilityRow[];
};

export type UpdateCouponBudgetInput = {
  totalBudgetAmount: number | null;
  maxRedemptions: number | null;
};

export type CouponPerformanceView = {
  couponId: string;
  redemptionCount: number;
  totalDiscountAmount: number;
  totalPlatformFundedAmount: number;
  totalGmv: number;
  totalPlatformFeeCollected: number;
  netMargin: number;
  newCustomerCount: number;
  returningCustomerCount: number;
  repeatPurchaseWithin30dCount: number;
  repeatPurchaseWithin90dCount: number;
};

export type CouponRedemptionSearchFilters = {
  code?: string;
  userId?: string;
  orderId?: string;
  cursor?: string;
  limit: number;
};

export type CouponRedemptionSearchRow = CouponRedemptionRecord & {
  couponCode: string;
  userEmail: string;
};

export type CouponLine = {
  lineId: string;
  productId: string;
  brandId: string;
  productTypeId: string;
  categoryIds: string[];
  eligibleAmount: number;
  hasBrandDiscount: boolean;
};

export type CouponValuation = {
  discountAmount: number;
  allocations: { lineId: string; discountAmount: number }[];
};

export type CouponRedemptionRecord = {
  id: string;
  couponId: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  platformFundedAmount: number;
  brandFundedAmount: number;
  status: CouponRedemptionStatus;
  releasedAt: Date | null;
  releasedReason: string | null;
  flaggedForReview: boolean;
  flagReason: string | null;
  createdAt: Date;
};

export type CartCouponPreview = {
  code: string;
  discountAmount: number;
} | null;
