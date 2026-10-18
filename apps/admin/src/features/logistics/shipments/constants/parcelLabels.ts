import type { ShipmentStatusValue } from "../../hub-operations/api/hubOperationsSchemas";
import type { ParcelEventCode, ParcelQueue, ParcelReturnOutcome } from "../api/parcelsSchemas";

export const RETURN_OUTCOME_LABELS: Record<ParcelReturnOutcome, string> = {
  CUSTOMER_REFUSED_OR_UNREACHABLE: "Refused or couldn't be reached — items fine",
  WRONG_OR_DAMAGED_ITEM: "Wrong or damaged item from the brand",
  PARTNER_DAMAGED_OR_LOST: "Damaged by the delivery partner",
};

export const RETURN_OUTCOME_HINTS: Record<ParcelReturnOutcome, string> = {
  CUSTOMER_REFUSED_OR_UNREACHABLE:
    "The customer is refunded the goods (a prepaid delivery fee is kept) and the refusal counts towards switching off cash on delivery.",
  WRONG_OR_DAMAGED_ITEM:
    "The customer gets everything back, including delivery, and it counts against each brand in the parcel.",
  PARTNER_DAMAGED_OR_LOST:
    "The customer gets everything back and a claim is opened against the partner. No one else is charged.",
};

export const PARCEL_QUEUE_LABELS: Record<ParcelQueue, string> = {
  TO_BOOK: "To book",
  TO_HAND_OVER: "Ready to hand over",
  WITH_PARTNER: "With the partner",
  FINISHED: "Finished",
};

export const PARCEL_STATUS_LABELS: Record<ShipmentStatusValue, string> = {
  PACKED: "Packed",
  HANDED_TO_PARTNER: "Handed to partner",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERY_FAILED: "Delivery attempt failed",
  DELIVERED: "Delivered",
  RETURNING: "Coming back",
  RETURNED_TO_HUB: "Back at the hub",
  CANCELLED: "Cancelled",
  LOST: "Lost",
};

export const PARCEL_EVENT_CODE_LABELS: Record<ParcelEventCode, string> = {
  HANDED_TO_PARTNER: "Partner collected it",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERY_FAILED: "Delivery attempt failed",
  DELIVERED: "Delivered",
  RETURNING: "Coming back to the hub",
  RETURNED_TO_HUB: "Back at the hub",
  LOST: "Lost",
  DELIVERY_RESCHEDULED: "Delivery rescheduled",
  NOTE: "Note only",
};

export const PARCEL_UPDATE_NOTE_MIN_LENGTH = 3;
export const PARCEL_UPDATE_NOTE_MAX_LENGTH = 500;
