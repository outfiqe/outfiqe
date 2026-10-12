import {
  FIT_HEIGHT_CM_MAX,
  FIT_HEIGHT_CM_MIN,
  FIT_WEIGHT_KG_MAX,
  FIT_WEIGHT_KG_MIN,
  type FitRange,
} from "@outfiqe/utils";
import { z } from "zod";

export type FitRangeDraft = {
  minHeightCm: string;
  maxHeightCm: string;
  minWeightKg: string;
  maxWeightKg: string;
};

export const EMPTY_FIT_RANGE_DRAFT: FitRangeDraft = {
  minHeightCm: "",
  maxHeightCm: "",
  minWeightKg: "",
  maxWeightKg: "",
};

const WHOLE_NUMBER_PATTERN = /^\d+$/;

const INCOMPLETE_RANGE_MESSAGE = "Fill in all four numbers, or leave them all empty.";
const HEIGHT_BOUNDS_MESSAGE = `Heights must be whole numbers from ${FIT_HEIGHT_CM_MIN} to ${FIT_HEIGHT_CM_MAX} cm.`;
const WEIGHT_BOUNDS_MESSAGE = `Weights must be whole numbers from ${FIT_WEIGHT_KG_MIN} to ${FIT_WEIGHT_KG_MAX} kg.`;
const HEIGHT_ORDER_MESSAGE = "The shortest height can't be above the tallest.";
const WEIGHT_ORDER_MESSAGE = "The lightest weight can't be above the heaviest.";

const isWithinBounds = (draftValue: string, lowest: number, highest: number): boolean => {
  if (!WHOLE_NUMBER_PATTERN.test(draftValue)) return false;
  const numericValue = Number(draftValue);
  return numericValue >= lowest && numericValue <= highest;
};

export const isFitRangeDraftEmpty = (draft: FitRangeDraft): boolean =>
  Object.values(draft).every((draftValue) => draftValue.trim() === "");

export const findFitRangeDraftProblem = (draft: FitRangeDraft): string | null => {
  if (isFitRangeDraftEmpty(draft)) return null;
  const { minHeightCm, maxHeightCm, minWeightKg, maxWeightKg } = draft;
  if (Object.values(draft).some((draftValue) => draftValue.trim() === "")) {
    return INCOMPLETE_RANGE_MESSAGE;
  }
  const areHeightsValid = [minHeightCm, maxHeightCm].every((height) =>
    isWithinBounds(height.trim(), FIT_HEIGHT_CM_MIN, FIT_HEIGHT_CM_MAX),
  );
  if (!areHeightsValid) return HEIGHT_BOUNDS_MESSAGE;
  const areWeightsValid = [minWeightKg, maxWeightKg].every((weight) =>
    isWithinBounds(weight.trim(), FIT_WEIGHT_KG_MIN, FIT_WEIGHT_KG_MAX),
  );
  if (!areWeightsValid) return WEIGHT_BOUNDS_MESSAGE;
  if (Number(minHeightCm) > Number(maxHeightCm)) return HEIGHT_ORDER_MESSAGE;
  if (Number(minWeightKg) > Number(maxWeightKg)) return WEIGHT_ORDER_MESSAGE;
  return null;
};

export const fitRangeDraftSchema = z
  .object({
    minHeightCm: z.string(),
    maxHeightCm: z.string(),
    minWeightKg: z.string(),
    maxWeightKg: z.string(),
  })
  .superRefine((draft, context) => {
    const problem = findFitRangeDraftProblem(draft);
    if (problem) context.addIssue({ code: "custom", message: problem });
  });

export const toFitRangeDraft = (fitRange: FitRange | null): FitRangeDraft =>
  fitRange
    ? {
        minHeightCm: String(fitRange.minHeightCm),
        maxHeightCm: String(fitRange.maxHeightCm),
        minWeightKg: String(fitRange.minWeightKg),
        maxWeightKg: String(fitRange.maxWeightKg),
      }
    : EMPTY_FIT_RANGE_DRAFT;

export const toFitRange = (draft: FitRangeDraft): FitRange | null =>
  isFitRangeDraftEmpty(draft) || findFitRangeDraftProblem(draft) !== null
    ? null
    : {
        minHeightCm: Number(draft.minHeightCm),
        maxHeightCm: Number(draft.maxHeightCm),
        minWeightKg: Number(draft.minWeightKg),
        maxWeightKg: Number(draft.maxWeightKg),
      };
