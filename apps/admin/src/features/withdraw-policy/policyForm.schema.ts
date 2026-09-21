import { z } from "zod";

import { wholeNumberText } from "@/lib/formFields";

import { windowTypeSchema } from "./schemas";

const MAX_AMOUNT = 1_000_000_000;
const MAX_WINDOW_DAYS = 366;
const MAX_ATTEMPTS = 100;
const MAX_COOLDOWN_DAYS = 365;
const PROCESSING_NOTE_MAX_LENGTH = 300;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

const isAtLeast = (minimum: number) => (raw: string) =>
  !WHOLE_NUMBER_PATTERN.test(raw) || Number(raw) >= minimum;

export const policyFormSchema = z
  .object({
    minAmount: wholeNumberText("a minimum amount", { max: MAX_AMOUNT }),
    maxAmount: wholeNumberText("a maximum amount", { max: MAX_AMOUNT }).refine(isAtLeast(1), {
      message: "The maximum amount must be at least Rs. 1.",
    }),
    windowType: windowTypeSchema,
    windowValue: wholeNumberText("a window value", { max: MAX_WINDOW_DAYS }).refine(isAtLeast(1), {
      message: "The window value must be at least 1.",
    }),
    maxAttemptsPerWindow: wholeNumberText("the attempts per window", {
      max: MAX_ATTEMPTS,
    }).refine(isAtLeast(1), { message: "Allow at least 1 attempt." }),
    cooldownAfterRejectionDays: wholeNumberText("the cooldown in days", {
      max: MAX_COOLDOWN_DAYS,
    }),
    processingNoteText: z
      .string()
      .trim()
      .min(1, "Enter a processing note.")
      .max(PROCESSING_NOTE_MAX_LENGTH, `Use at most ${PROCESSING_NOTE_MAX_LENGTH} characters.`),
  })
  .refine(
    (values) =>
      !WHOLE_NUMBER_PATTERN.test(values.minAmount) ||
      !WHOLE_NUMBER_PATTERN.test(values.maxAmount) ||
      Number(values.maxAmount) > Number(values.minAmount),
    { message: "Max amount must be greater than min amount.", path: ["maxAmount"] },
  );
export type PolicyFormValues = z.infer<typeof policyFormSchema>;
