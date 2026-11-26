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
  [OrderRefundCause.PARTNER_FAILED]: "The delivery partner lost or damaged it",
  [OrderRefundCause.SOLD_OUT_AT_PAYMENT]: "It sold out just before your payment went through",
};

export const CANCELLATION_REASON_SENTENCES: Record<OrderRefundCause, string> = {
  [OrderRefundCause.CUSTOMER_CANCELLED]: "You cancelled it.",
  [OrderRefundCause.BRAND_UNAVAILABLE]: "The brand couldn't supply it.",
  [OrderRefundCause.HUB_INSPECTION_FAILED]: "It didn't pass our quality check.",
  [OrderRefundCause.RETURNED]: "It was returned.",
  [OrderRefundCause.CUSTOMER_REFUSED]: "It was refused at delivery.",
  [OrderRefundCause.STAFF_ADJUSTMENT]: "Outfiqe cancelled it for you.",
  [OrderRefundCause.PARTNER_FAILED]: "The delivery partner lost or damaged it.",
  [OrderRefundCause.SOLD_OUT_AT_PAYMENT]: "It sold out just before your payment went through.",
};

export const RETURN_CAUSES: ReadonlySet<OrderRefundCause> = new Set([
  OrderRefundCause.RETURNED,
  OrderRefundCause.CUSTOMER_REFUSED,
]);

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
