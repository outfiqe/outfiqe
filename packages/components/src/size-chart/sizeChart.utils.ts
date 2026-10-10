import type { FitRange } from "@outfiqe/utils";

const RANGE_SEPARATOR = "–";
export const MISSING_RANGE_TEXT = "—";

export const formatHeightRange = (fitRange: FitRange | null): string =>
  fitRange
    ? `${fitRange.minHeightCm}${RANGE_SEPARATOR}${fitRange.maxHeightCm}`
    : MISSING_RANGE_TEXT;

export const formatWeightRange = (fitRange: FitRange | null): string =>
  fitRange
    ? `${fitRange.minWeightKg}${RANGE_SEPARATOR}${fitRange.maxWeightKg}`
    : MISSING_RANGE_TEXT;

export const STRETCH_LABEL = {
  STRETCHABLE: "Stretchable fabric",
  NON_STRETCH: "Non-stretch fabric",
} as const;
