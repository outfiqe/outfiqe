import type { BrandPayoutStatus, PaymentMethod } from "@outfiqe/types";

export const PAYMENT_METHOD_ORDER: PaymentMethod[] = ["COD", "ESEWA", "KHALTI"];
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  COD: "COD",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
};

export const BRAND_PAYOUT_STATUS_ORDER: BrandPayoutStatus[] = [
  "PENDING",
  "AVAILABLE",
  "WITHDRAWN",
  "VOIDED",
];
export const BRAND_PAYOUT_STATUS_LABEL: Record<BrandPayoutStatus, string> = {
  PENDING: "Pending",
  AVAILABLE: "Available",
  WITHDRAWN: "Withdrawn",
  VOIDED: "Voided",
};

export const money = (amount: number) => `Rs. ${amount.toLocaleString()}`;
export const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`;
