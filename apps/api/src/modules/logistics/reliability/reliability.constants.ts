export const RELIABILITY_WINDOW_DAYS = 30;
export const RELIABILITY_WATCH_LIST_MIN_INCIDENTS = 3;

export const RELIABILITY_THRESHOLDS = {
  warning: { minIncidents: 5, minIncidentRatePercent: 10 },
  review: { minIncidents: 10, minIncidentRatePercent: 20 },
};

export const NEW_BRAND_GRACE = {
  days: 30,
  pickups: 20,
};

export const BRAND_RELIABILITY_LEVEL = {
  GOOD: "GOOD",
  WARNING: "WARNING",
  REVIEW: "REVIEW",
} as const;

export type BrandReliabilityLevel =
  (typeof BRAND_RELIABILITY_LEVEL)[keyof typeof BRAND_RELIABILITY_LEVEL];
