import type { UnavailableItemReportStatus } from "../api/unavailableItemSchemas";

export const UNAVAILABLE_ITEM_STATUS_LABELS: Record<UnavailableItemReportStatus, string> = {
  PENDING: "Waiting for Outfiqe",
  APPROVED: "Approved — buyer refunded",
  REJECTED: "Not approved — please send it",
};

export const UNAVAILABLE_REASON_MIN_LENGTH = 3;
export const UNAVAILABLE_REASON_MAX_LENGTH = 500;
