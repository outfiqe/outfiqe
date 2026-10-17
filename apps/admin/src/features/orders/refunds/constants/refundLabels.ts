import {
  OrderRefundCause,
  OrderRefundMethod,
  OrderRefundStatus,
  RefundDestinationKind,
} from "@outfiqe/types";

export const REFUND_CAUSE_LABELS: Record<OrderRefundCause, string> = {
  [OrderRefundCause.CUSTOMER_CANCELLED]: "Customer cancelled",
  [OrderRefundCause.BRAND_UNAVAILABLE]: "Brand couldn't supply",
  [OrderRefundCause.HUB_INSPECTION_FAILED]: "Failed hub inspection",
  [OrderRefundCause.RETURNED]: "Returned",
  [OrderRefundCause.CUSTOMER_REFUSED]: "Customer refused delivery",
  [OrderRefundCause.STAFF_ADJUSTMENT]: "Staff adjustment",
};

export const REFUND_STATUS_LABELS: Record<OrderRefundStatus, string> = {
  [OrderRefundStatus.PENDING]: "Processing",
  [OrderRefundStatus.SUCCEEDED]: "Done",
  [OrderRefundStatus.NEEDS_MANUAL]: "Needs manual payment",
};

export const REFUND_METHOD_LABELS: Record<OrderRefundMethod, string> = {
  [OrderRefundMethod.GATEWAY]: "Refunded through the payment gateway",
  [OrderRefundMethod.CASH_NOT_COLLECTED]: "Taken off the cash to collect",
  [OrderRefundMethod.MANUAL_TRANSFER]: "Paid by manual transfer",
};

export const REFUND_DESTINATION_KIND_LABELS: Record<RefundDestinationKind, string> = {
  [RefundDestinationKind.KHALTI]: "Khalti",
  [RefundDestinationKind.ESEWA]: "eSewa",
  [RefundDestinationKind.BANK]: "Bank account",
};

export const REFUND_REASON_MIN_LENGTH = 3;
export const REFUND_REASON_MAX_LENGTH = 500;
export const TRANSFER_REFERENCE_MIN_LENGTH = 3;
