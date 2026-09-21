import { z } from "zod";

const MIN_XP_MULTIPLIER = 1;
const MAX_XP_MULTIPLIER = 10;
const MULTIPLIER_LABEL_MAX_LENGTH = 100;
const DEFAULT_XP_MULTIPLIER = "2";
const DECIMAL_NUMBER_PATTERN = /^\d+(\.\d+)?$/;

const isWithinMultiplierRange = (raw: string) =>
  Number(raw) >= MIN_XP_MULTIPLIER && Number(raw) <= MAX_XP_MULTIPLIER;

export const multiplierFormSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Enter a label for the multiplier.")
      .max(MULTIPLIER_LABEL_MAX_LENGTH, `Use at most ${MULTIPLIER_LABEL_MAX_LENGTH} characters.`),
    multiplier: z
      .string()
      .trim()
      .min(1, "Enter a multiplier.")
      .refine((raw) => raw === "" || DECIMAL_NUMBER_PATTERN.test(raw), {
        message: "Use a number such as 1.5.",
      })
      .refine((raw) => !DECIMAL_NUMBER_PATTERN.test(raw) || isWithinMultiplierRange(raw), {
        message: `Use a number from ${MIN_XP_MULTIPLIER} to ${MAX_XP_MULTIPLIER}.`,
      }),
    startsAt: z.string().min(1, "Choose when the multiplier starts."),
    endsAt: z.string().min(1, "Choose when the multiplier ends."),
  })
  .refine(
    (values) =>
      values.startsAt === "" ||
      values.endsAt === "" ||
      new Date(values.endsAt).getTime() > new Date(values.startsAt).getTime(),
    { message: "The multiplier must end after it starts.", path: ["endsAt"] },
  );
export type MultiplierFormValues = z.infer<typeof multiplierFormSchema>;

export const buildEmptyMultiplierForm = (startsAt: string): MultiplierFormValues => ({
  label: "",
  multiplier: DEFAULT_XP_MULTIPLIER,
  startsAt,
  endsAt: "",
});
