import {
  FulfilmentStatus,
  OrderRefundCause,
  PaymentMethod,
  PaymentStatus,
  PickupStatus,
} from "#generated/prisma/enums.js";

export const CAUSES_RETURNING_ORDER_FEES: ReadonlySet<OrderRefundCause> = new Set([
  OrderRefundCause.CUSTOMER_CANCELLED,
  OrderRefundCause.BRAND_UNAVAILABLE,
  OrderRefundCause.HUB_INSPECTION_FAILED,
  OrderRefundCause.RETURNED,
  OrderRefundCause.STAFF_ADJUSTMENT,
  OrderRefundCause.PARTNER_FAILED,
]);

export const CAUSES_RELEASING_COUPON_BUDGET: ReadonlySet<OrderRefundCause> = new Set([
  OrderRefundCause.BRAND_UNAVAILABLE,
  OrderRefundCause.HUB_INSPECTION_FAILED,
  OrderRefundCause.RETURNED,
  OrderRefundCause.CUSTOMER_REFUSED,
  OrderRefundCause.STAFF_ADJUSTMENT,
  OrderRefundCause.PARTNER_FAILED,
]);

export const PAYMENT_STATUSES_WITH_MONEY_TAKEN: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.PAID,
  PaymentStatus.PARTIALLY_REFUNDED,
]);

export const PAYMENT_STATUSES_WITH_NOTHING_TAKEN_YET: ReadonlySet<PaymentStatus> = new Set([
  PaymentStatus.DUE,
]);

export const PAYMENT_METHODS_WITH_GATEWAY_REFUNDS: ReadonlySet<PaymentMethod> = new Set([
  PaymentMethod.KHALTI,
]);

export const FULFILMENT_STATUSES_STILL_WITH_BRAND: ReadonlySet<FulfilmentStatus> = new Set([
  FulfilmentStatus.PLACED,
  FulfilmentStatus.PACKED,
]);

export const PICKUP_STATUSES_STILL_WITH_BRAND: ReadonlySet<PickupStatus> = new Set([
  PickupStatus.AWAITING_BRAND,
  PickupStatus.READY_FOR_PICKUP,
]);

export const MAX_REFUND_REASON_LENGTH = 500;
export const MIN_REFUND_REASON_LENGTH = 3;
export const MAX_REFUND_LINES = 100;
