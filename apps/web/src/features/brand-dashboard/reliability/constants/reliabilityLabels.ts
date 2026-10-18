import type { BrandIncidentKind, ReliabilityLevel } from "../api/reliabilitySchemas";

export const BRAND_INCIDENT_LABELS: Record<BrandIncidentKind, string> = {
  UNAVAILABLE_ITEM: "Couldn't supply an item",
  FAILED_INSPECTION: "Item failed our quality check",
  WASTED_VISIT: "Rider visit with nothing ready",
  MISSED_ROUND: "Missed a pickup round",
};

export const RELIABILITY_LEVEL_MESSAGES: Record<ReliabilityLevel, string> = {
  GOOD: "Nothing to worry about. Here's what held up a few orders, so you can avoid it next time.",
  WARNING:
    "Several of your orders ran into problems recently. Having orders ready on time keeps them moving.",
  REVIEW: "Quite a few orders ran into problems recently. Our team will get in touch to help.",
};

export const NEW_TO_PICKUP_MESSAGE =
  "You're new to Outfiqe pickup, so these don't count against you while you settle in.";

export const WHAT_COUNTS_MESSAGE =
  "Only things in your hands count: items you couldn't supply, items that failed our quality check and rider visits with nothing ready. Customer refusals and returns never count.";
