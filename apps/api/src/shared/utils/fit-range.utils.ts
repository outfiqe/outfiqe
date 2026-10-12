import type { FitRange } from "@outfiqe/utils";

import type { SizeFitColumns } from "#types/fit-range.types.js";

export const SIZE_FIT_COLUMNS_SELECT = {
  minHeightCm: true,
  maxHeightCm: true,
  minWeightKg: true,
  maxWeightKg: true,
} as const;

export const toFitRange = ({
  minHeightCm,
  maxHeightCm,
  minWeightKg,
  maxWeightKg,
}: SizeFitColumns): FitRange | null =>
  minHeightCm === null || maxHeightCm === null || minWeightKg === null || maxWeightKg === null
    ? null
    : { minHeightCm, maxHeightCm, minWeightKg, maxWeightKg };

export const toFitColumns = (fitRange: FitRange | null): SizeFitColumns => ({
  minHeightCm: fitRange?.minHeightCm ?? null,
  maxHeightCm: fitRange?.maxHeightCm ?? null,
  minWeightKg: fitRange?.minWeightKg ?? null,
  maxWeightKg: fitRange?.maxWeightKg ?? null,
});
