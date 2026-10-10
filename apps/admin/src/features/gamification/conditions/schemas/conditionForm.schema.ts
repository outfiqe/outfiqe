import { z } from "zod";

const CONDITION_VALUE_PATTERN = /^-?\d+(\.\d+)?$/;
const MIN_CONDITION_COUNT = 1;

export const conditionRowSchema = z.object({
  metric: z.string(),
  operator: z.string(),
  value: z
    .string()
    .trim()
    .min(1, "Enter a value.")
    .regex(CONDITION_VALUE_PATTERN, "Use a number such as 10 or 2.5."),
});

export const conditionsSchema = z
  .array(conditionRowSchema)
  .min(MIN_CONDITION_COUNT, "Add at least one condition.");

export const conditionValueErrorKey = (conditionIndex: number) =>
  `conditions.${conditionIndex}.value`;
