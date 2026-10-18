import type { ReliabilityLevel } from "../api/reliabilitySchemas";

export const RELIABILITY_LEVEL_LABELS: Record<ReliabilityLevel, string> = {
  GOOD: "Watching",
  WARNING: "Warned",
  REVIEW: "Needs review",
};
