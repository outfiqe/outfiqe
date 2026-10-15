import type { FulfilmentStatusValue, PaymentStatusValue } from "@/features/orders";

import type { FulfilmentModeValue, PickupStatusValue } from "../../pickups/api/brandPickupSchemas";
import type { OrderFulfilmentSummary } from "../api/brandFulfilmentSchemas";

type BadgeTone = "neutral" | "progress" | "positive" | "negative";

export const SHIPMENT_STATUS_LABEL: Record<FulfilmentStatusValue, string> = {
  PLACED: "To pack",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

export const SHIPMENT_STATUS_TONE: Record<FulfilmentStatusValue, BadgeTone> = {
  PLACED: "neutral",
  PACKED: "progress",
  SHIPPED: "progress",
  DELIVERED: "positive",
  CANCELLED: "negative",
  RETURNED: "negative",
};

export const ORDER_SUMMARY_LABEL: Record<OrderFulfilmentSummary, string> = {
  UNFULFILLED: "No parcels shipped",
  PARTIALLY_SHIPPED: "Some parcels shipped",
  SHIPPED: "All parcels shipped",
  FULFILLED: "All parcels delivered",
  CANCELLED: "Order cancelled",
  RETURNED: "Order returned",
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

const PICKUP_STATUS_LABEL: Partial<Record<PickupStatusValue, string>> = {
  AWAITING_BRAND: "To pack",
  READY_FOR_PICKUP: "Ready for pickup",
  PICKED_UP: "Picked up",
  AT_HUB: "At Outfiqe hub",
  RETURN_AT_HUB: "Coming back",
  RETURNING_TO_BRAND: "On its way back to you",
  RETURNED_TO_BRAND: "Returned to you",
  CANCELLED: "Cancelled",
};

const PICKUP_STATUS_TONE: Partial<Record<PickupStatusValue, BadgeTone>> = {
  AWAITING_BRAND: "neutral",
  READY_FOR_PICKUP: "progress",
  PICKED_UP: "progress",
  AT_HUB: "progress",
  RETURN_AT_HUB: "negative",
  RETURNING_TO_BRAND: "negative",
  RETURNED_TO_BRAND: "negative",
  CANCELLED: "negative",
};

type ShipmentStatusSource = {
  status: FulfilmentStatusValue;
  fulfilmentMode: FulfilmentModeValue;
  pickupStatus: PickupStatusValue | null;
};

export const isDeliveredByOutfiqe = ({
  fulfilmentMode,
}: Pick<ShipmentStatusSource, "fulfilmentMode">) => fulfilmentMode === "OUTFIQE_LOGISTICS";

export const describeShipmentStatus = ({
  status,
  fulfilmentMode,
  pickupStatus,
}: ShipmentStatusSource): { label: string; tone: BadgeTone } => {
  const pickupLabel = pickupStatus ? PICKUP_STATUS_LABEL[pickupStatus] : undefined;
  const pickupTone = pickupStatus ? PICKUP_STATUS_TONE[pickupStatus] : undefined;
  const usesPickupStatus =
    isDeliveredByOutfiqe({ fulfilmentMode }) &&
    pickupLabel !== undefined &&
    pickupTone !== undefined;
  return usesPickupStatus
    ? { label: pickupLabel, tone: pickupTone }
    : { label: SHIPMENT_STATUS_LABEL[status], tone: SHIPMENT_STATUS_TONE[status] };
};
