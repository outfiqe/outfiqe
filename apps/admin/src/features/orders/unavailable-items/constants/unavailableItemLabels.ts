import type { UnavailableItemStatus } from "../api/unavailableItemsSchemas";

export const UNAVAILABLE_ITEM_STATUS_LABELS: Record<UnavailableItemStatus, string> = {
  PENDING: "To review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const UNAVAILABLE_ITEMS_QUERY_KEY = ["admin-unavailable-items"] as const;

export const REJECTION_NOTE_MIN_LENGTH = 3;
