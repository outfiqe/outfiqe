import {
  BRAND_RELIABILITY_LEVEL,
  type BrandReliabilityLevel,
  RELIABILITY_REVIEW_INCIDENTS,
  RELIABILITY_WARNING_INCIDENTS,
} from "./reliability.constants.js";

export const describeReliabilityLevel = (incidentCount: number): BrandReliabilityLevel => {
  if (incidentCount >= RELIABILITY_REVIEW_INCIDENTS) return BRAND_RELIABILITY_LEVEL.REVIEW;
  if (incidentCount >= RELIABILITY_WARNING_INCIDENTS) return BRAND_RELIABILITY_LEVEL.WARNING;
  return BRAND_RELIABILITY_LEVEL.GOOD;
};
