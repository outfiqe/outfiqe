import type { ShipmentStatusValue } from "../../hub-operations/api/hubOperationsSchemas";
import type { ParcelEventCode, ParcelQueue } from "../api/parcelsSchemas";

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
