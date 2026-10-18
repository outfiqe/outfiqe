import type { BrandIncidentKind, ReliabilityLevel } from "../api/reliabilitySchemas";

export const BRAND_INCIDENT_LABELS: Record<BrandIncidentKind, string> = {
  UNAVAILABLE_ITEM: "Couldn't supply an item",
  FAILED_INSPECTION: "Item failed our quality check",
  WASTED_VISIT: "Rider visit with nothing ready",
  MISSED_ROUND: "Missed a pickup round",
};

export const RELIABILITY_LEVEL_MESSAGES: Record<ReliabilityLevel, string> = {
  GOOD: "Things are running smoothly.",
  WARNING: "A few problems recently. Please make sure orders are ready on time.",
  REVIEW: "Too many problems recently. Our team will review your shop.",
};
