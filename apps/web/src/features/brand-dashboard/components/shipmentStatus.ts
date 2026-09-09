import type { FulfilmentStatusValue, PaymentStatusValue } from "@/features/orders";

import type { OrderFulfilmentSummary } from "../api/brandFulfilmentSchemas";

type BadgeTone = "neutral" | "progress" | "positive" | "negative";

export const SHIPMENT_STATUS_LABEL: Record<FulfilmentStatusValue, string> = {
  PLACED: "To pack",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const SHIPMENT_STATUS_TONE: Record<FulfilmentStatusValue, BadgeTone> = {
  PLACED: "neutral",
  PACKED: "progress",
  SHIPPED: "progress",
  DELIVERED: "positive",
  CANCELLED: "negative",
};

export const ORDER_SUMMARY_LABEL: Record<OrderFulfilmentSummary, string> = {
  UNFULFILLED: "No parcels shipped",
  PARTIALLY_SHIPPED: "Some parcels shipped",
  SHIPPED: "All parcels shipped",
  FULFILLED: "All parcels delivered",
  CANCELLED: "Order cancelled",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatusValue, string> = {
  INITIATED: "Payment pending",
  PAID: "Paid",
  DUE: "Cash on delivery",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
};

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-muted text-foreground",
  progress: "bg-primary/10 text-primary-strong",
  positive: "bg-primary/10 text-primary-strong",
  negative: "bg-destructive/10 text-destructive",
};

export const badgeToneClass = (tone: BadgeTone): string => BADGE_TONE_CLASS[tone];

const NEXT_STATUS: Partial<Record<FulfilmentStatusValue, FulfilmentStatusValue>> = {
  PLACED: "PACKED",
  PACKED: "SHIPPED",
  SHIPPED: "DELIVERED",
};

export const nextShipmentStatus = (
  status: FulfilmentStatusValue,
): "PACKED" | "SHIPPED" | "DELIVERED" | null => {
  const next = NEXT_STATUS[status];
  return next === "PACKED" || next === "SHIPPED" || next === "DELIVERED" ? next : null;
};

export const canRequestCancellation = (status: FulfilmentStatusValue): boolean =>
  status === "PLACED" || status === "PACKED" || status === "SHIPPED";

export const formatShortOrderId = (orderId: string): string => orderId.slice(0, 8).toUpperCase();
