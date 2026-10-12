export const COUPON_CODE_MIN_LENGTH = 4;
export const COUPON_CODE_MAX_LENGTH = 24;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export const COUPON_APPROVAL_BUDGET_THRESHOLD = 50_000;

export const VELOCITY_WINDOW_HOURS = 24;
export const VELOCITY_REDEMPTION_THRESHOLD = 3;
export const COUPON_BUDGET_ALERT_THRESHOLDS_PERCENT = [50, 80, 95, 100] as const;
export const COUPON_BUDGET_AUTO_PAUSE_THRESHOLD_PERCENT = 100;
export const REPEAT_PURCHASE_WINDOW_DAYS = [30, 90] as const;

export const REFUSAL_MESSAGES = {
  COUPON_NOT_FOUND: "We couldn't find that coupon code.",
  COUPON_NOT_ACTIVE: "This coupon isn't active right now.",
  COUPON_MIN_SUBTOTAL_NOT_MET: "Your order doesn't meet this coupon's minimum.",
  COUPON_ALREADY_USED: "You've already used this coupon.",
  COUPON_NOT_ELIGIBLE_FOR_ITEMS: "This coupon doesn't apply to the items in your bag.",
  COUPON_REQUIRES_PREPAID: "This coupon requires prepaid checkout (eSewa or Khalti).",
  COUPON_FIRST_ORDER_ONLY: "This coupon is only valid on your first order.",
  COUPON_EXHAUSTED: "This coupon has reached its limit.",
} as const;
