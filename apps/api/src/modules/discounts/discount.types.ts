export type DiscountableLine = {
  orderItemId: string;
  eligibleAmount: number;
};

export type AllocatedDiscount = {
  orderItemId: string;
  discountAmount: number;
};

export type BrandDiscountType = "PERCENT" | "FIXED";

export type ActiveBrandDiscount = {
  discountType: BrandDiscountType;
  percentBasisPoints: number | null;
  fixedAmount: number | null;
};

export type CouponValueType = "PERCENT" | "FIXED";

export type CouponValueRule = {
  type: CouponValueType;
  percentBasisPoints: number | null;
  fixedAmount: number | null;
  maxDiscountAmount: number | null;
};

export type OrderMoneyInvariantInput = {
  subtotal: number;
  platformDiscountTotal: number;
  deliveryFee: number;
  codFee: number;
  total: number;
  platformDiscountAllocations: number[];
};
