export const RELIABILITY_WINDOW_DAYS = 30;
export const RELIABILITY_WARNING_INCIDENTS = 3;
export const RELIABILITY_REVIEW_INCIDENTS = 6;

export const BRAND_RELIABILITY_LEVEL = {
  GOOD: "GOOD",
  WARNING: "WARNING",
  REVIEW: "REVIEW",
} as const;

export type BrandReliabilityLevel =
  (typeof BRAND_RELIABILITY_LEVEL)[keyof typeof BRAND_RELIABILITY_LEVEL];
