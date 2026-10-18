import type { ReliabilityLevel } from "../api/reliabilitySchemas";

export const RELIABILITY_LEVEL_LABELS: Record<ReliabilityLevel, string> = {
  GOOD: "Fine",
  WARNING: "Warned",
  REVIEW: "Needs review",
};
