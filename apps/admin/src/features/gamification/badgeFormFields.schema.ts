import { z } from "zod";

import { wholeNumberText } from "@/lib/formFields";

export const BADGE_NAME_MAX_LENGTH = 100;
export const BADGE_DESCRIPTION_MAX_LENGTH = 500;
export const BADGE_ICON_MAX_LENGTH = 8;
const MAX_BADGE_XP_REWARD = 1_000_000;
const MAX_ASSIGNMENT_LIMIT = 1_000_000;
const MIN_ASSIGNMENT_LIMIT = 1;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

export const badgeNameText = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${fieldName}.`)
    .max(BADGE_NAME_MAX_LENGTH, `Use at most ${BADGE_NAME_MAX_LENGTH} characters.`);

export const badgeDescriptionText = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${fieldName}.`)
    .max(BADGE_DESCRIPTION_MAX_LENGTH, `Use at most ${BADGE_DESCRIPTION_MAX_LENGTH} characters.`);

export const badgeIconText = () =>
  z.string().trim().max(BADGE_ICON_MAX_LENGTH, `Use at most ${BADGE_ICON_MAX_LENGTH} characters.`);

export const requiredBadgeIconText = () => badgeIconText().min(1, "Enter an icon for the badge.");

export const badgeXpRewardText = () =>
  wholeNumberText("an XP reward", { max: MAX_BADGE_XP_REWARD });

export const optionalAssignmentLimitText = () =>
  z
    .string()
    .trim()
    .refine((raw) => raw === "" || WHOLE_NUMBER_PATTERN.test(raw), {
      message: "Use a whole number with no decimals or minus sign.",
    })
    .refine(
      (raw) => raw === "" || !WHOLE_NUMBER_PATTERN.test(raw) || Number(raw) >= MIN_ASSIGNMENT_LIMIT,
      {
        message: `Use a number that is at least ${MIN_ASSIGNMENT_LIMIT}, or leave blank for unlimited.`,
      },
    )
    .refine(
      (raw) => raw === "" || !WHOLE_NUMBER_PATTERN.test(raw) || Number(raw) <= MAX_ASSIGNMENT_LIMIT,
      {
        message: `Use a number up to ${MAX_ASSIGNMENT_LIMIT.toLocaleString()}.`,
      },
    );

export const isEndAfterStart = (startText: string, endText: string) =>
  startText === "" || endText === "" || new Date(endText).getTime() > new Date(startText).getTime();
