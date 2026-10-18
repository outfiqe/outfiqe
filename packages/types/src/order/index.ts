export type PaymentMethod = "COD" | "ESEWA" | "KHALTI";
export type PaymentStatus =
  "INITIATED" | "PAID" | "DUE" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
export type FulfilmentStatus =
  "PLACED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED";
export type PaymentTransactionType = "PAYMENT" | "REFUND";
export type PaymentTransactionStatus = "INITIATED" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export const OrderRefundMethod = {
  GATEWAY: "GATEWAY",
  CASH_NOT_COLLECTED: "CASH_NOT_COLLECTED",
  MANUAL_TRANSFER: "MANUAL_TRANSFER",
} as const;
export type OrderRefundMethod = (typeof OrderRefundMethod)[keyof typeof OrderRefundMethod];

export const OrderRefundStatus = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  NEEDS_MANUAL: "NEEDS_MANUAL",
} as const;
export type OrderRefundStatus = (typeof OrderRefundStatus)[keyof typeof OrderRefundStatus];

export const OrderRefundCause = {
  CUSTOMER_CANCELLED: "CUSTOMER_CANCELLED",
  BRAND_UNAVAILABLE: "BRAND_UNAVAILABLE",
  HUB_INSPECTION_FAILED: "HUB_INSPECTION_FAILED",
  RETURNED: "RETURNED",
  CUSTOMER_REFUSED: "CUSTOMER_REFUSED",
  STAFF_ADJUSTMENT: "STAFF_ADJUSTMENT",
  PARTNER_FAILED: "PARTNER_FAILED",
} as const;
export type OrderRefundCause = (typeof OrderRefundCause)[keyof typeof OrderRefundCause];

export const RefundDestinationKind = {
  KHALTI: "KHALTI",
  ESEWA: "ESEWA",
  BANK: "BANK",
} as const;
export type RefundDestinationKind =
  (typeof RefundDestinationKind)[keyof typeof RefundDestinationKind];
