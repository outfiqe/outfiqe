import { z } from "zod";

import { optionalWholeNumberText, percentText, wholeNumberText } from "@/lib/formFields";

import type { FeeTypeValue } from "./schemas";

const LADDER_FLOOR_PRICE = 0;
const MAX_TIER_AMOUNT = 1_000_000_000;
const MAX_PERCENT = 100;

export type TierRowState = {
  key: string;
  minPrice: string;
  maxPrice: string;
  feeType: FeeTypeValue;
  flatAmount: string;
  ratePercent: string;
};

export type TierRowField = "minPrice" | "maxPrice" | "flatAmount" | "ratePercent";
export type TierRowErrors = Partial<Record<TierRowField, string>>;

export type LadderValidation = {
  rowErrorsByKey: Record<string, TierRowErrors>;
  ladderError: string | null;
};

const baseRowSchema = z.object({
  minPrice: wholeNumberText("a minimum price", { max: MAX_TIER_AMOUNT }),
  maxPrice: optionalWholeNumberText(),
});

const flatRowSchema = baseRowSchema.extend({
  flatAmount: wholeNumberText("a commission amount", { max: MAX_TIER_AMOUNT }).refine(
    (raw) => raw === "" || Number(raw) > 0,
    { message: "Commission must be at least Rs. 1." },
  ),
});

const percentRowSchema = baseRowSchema.extend({
  ratePercent: percentText("a commission rate", { max: MAX_PERCENT }).refine(
    (raw) => raw === "" || Number(raw) > 0,
    { message: "Commission must be above 0%." },
  ),
});

const validateRow = (tierRow: TierRowState): TierRowErrors => {
  const schema = tierRow.feeType === "FLAT" ? flatRowSchema : percentRowSchema;
  const result = schema.safeParse(tierRow);
  if (result.success) return {};

  const errors: TierRowErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as TierRowField;
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
};

const validateLadderShape = (tierRows: TierRowState[]): string | null => {
  if (tierRows.length === 0) return "Add at least one price band.";

  const sortedTierRows = [...tierRows].sort((a, b) => Number(a.minPrice) - Number(b.minPrice));
  const firstTierRow = sortedTierRows[0];
  const lastTierRow = sortedTierRows[sortedTierRows.length - 1];
  if (!firstTierRow || !lastTierRow) return "Add at least one price band.";

  if (Number(firstTierRow.minPrice) !== LADDER_FLOOR_PRICE) {
    return "The lowest band must start at Rs. 0.";
  }
  if (lastTierRow.maxPrice !== "") {
    return "The highest band must be open-ended — leave its max price blank.";
  }

  for (let index = 0; index < sortedTierRows.length - 1; index += 1) {
    const currentTierRow = sortedTierRows[index];
    const nextTierRow = sortedTierRows[index + 1];
    if (Number(currentTierRow?.maxPrice) !== Number(nextTierRow?.minPrice)) {
      return "Bands must be contiguous, with no gaps or overlaps between them.";
    }
  }

  return null;
};

export const validateLadder = (tierRows: TierRowState[]): LadderValidation => {
  const rowErrorsByKey: Record<string, TierRowErrors> = {};
  for (const tierRow of tierRows) {
    const errors = validateRow(tierRow);
    if (Object.keys(errors).length > 0) rowErrorsByKey[tierRow.key] = errors;
  }

  const hasRowErrors = Object.keys(rowErrorsByKey).length > 0;
  return { rowErrorsByKey, ladderError: hasRowErrors ? null : validateLadderShape(tierRows) };
};
