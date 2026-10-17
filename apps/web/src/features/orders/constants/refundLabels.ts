import {
  OrderRefundCause,
  OrderRefundMethod,
  OrderRefundStatus,
  RefundDestinationKind,
} from "@outfiqe/types";

export const REFUND_CAUSE_LABELS: Record<OrderRefundCause, string> = {
  [OrderRefundCause.CUSTOMER_CANCELLED]: "You cancelled",
  [OrderRefundCause.BRAND_UNAVAILABLE]: "The brand couldn't supply it",
  [OrderRefundCause.HUB_INSPECTION_FAILED]: "Didn't pass our quality check",
  [OrderRefundCause.RETURNED]: "Returned",
  [OrderRefundCause.CUSTOMER_REFUSED]: "Refused at delivery",
  [OrderRefundCause.STAFF_ADJUSTMENT]: "Refunded by Outfiqe",
};

export const REFUND_STATUS_LABELS: Record<OrderRefundStatus, string> = {
  [OrderRefundStatus.PENDING]: "Processing",
  [OrderRefundStatus.SUCCEEDED]: "Done",
  [OrderRefundStatus.NEEDS_MANUAL]: "Being paid by our team",
};

export const REFUND_METHOD_LABELS: Record<OrderRefundMethod, string> = {
  [OrderRefundMethod.GATEWAY]: "Back to your payment",
  [OrderRefundMethod.CASH_NOT_COLLECTED]: "Taken off what you pay on delivery",
  [OrderRefundMethod.MANUAL_TRANSFER]: "Sent to your refund account",
};

export const REFUND_DESTINATION_KIND_LABELS: Record<RefundDestinationKind, string> = {
  [RefundDestinationKind.KHALTI]: "Khalti",
  [RefundDestinationKind.ESEWA]: "eSewa",
  [RefundDestinationKind.BANK]: "Bank account",
};
