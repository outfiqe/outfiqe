import { z } from "zod";

const MANUAL_ACTION_REASON_MAX_LENGTH = 500;
const MAX_XP_ADJUSTMENT = 1_000_000_000;
const SIGNED_WHOLE_NUMBER_PATTERN = /^-?\d+$/;

const selectedUserSchema = z
  .object({ id: z.string(), name: z.string(), handle: z.string() })
  .nullable()
  .refine((selectedUser): boolean => selectedUser !== null, { message: "Choose a user." });

const reasonSchema = z
  .string()
  .trim()
  .min(1, "Enter a reason for the audit trail.")
  .max(
    MANUAL_ACTION_REASON_MAX_LENGTH,
    `Use at most ${MANUAL_ACTION_REASON_MAX_LENGTH} characters.`,
  );

export const awardBadgeFormSchema = z.object({
  badgeId: z.string().min(1, "Choose a badge."),
  recipient: selectedUserSchema,
  reason: reasonSchema,
});
export type AwardBadgeFormValues = z.infer<typeof awardBadgeFormSchema>;

export const EMPTY_AWARD_BADGE_FORM: AwardBadgeFormValues = {
  badgeId: "",
  recipient: null,
  reason: "",
};

export const adjustXpFormSchema = z.object({
  target: selectedUserSchema,
  amount: z
    .string()
    .trim()
    .min(1, "Enter an amount.")
    .refine((raw) => raw === "" || SIGNED_WHOLE_NUMBER_PATTERN.test(raw), {
      message: "Use a whole number, with a minus sign to dock XP.",
    })
    .refine((raw) => !SIGNED_WHOLE_NUMBER_PATTERN.test(raw) || Number(raw) !== 0, {
      message: "The amount must not be zero.",
    })
    .refine(
      (raw) => !SIGNED_WHOLE_NUMBER_PATTERN.test(raw) || Math.abs(Number(raw)) <= MAX_XP_ADJUSTMENT,
      { message: `Use an amount up to ${MAX_XP_ADJUSTMENT.toLocaleString()}.` },
    ),
  reason: reasonSchema,
});
export type AdjustXpFormValues = z.infer<typeof adjustXpFormSchema>;

export const EMPTY_ADJUST_XP_FORM: AdjustXpFormValues = { target: null, amount: "", reason: "" };
