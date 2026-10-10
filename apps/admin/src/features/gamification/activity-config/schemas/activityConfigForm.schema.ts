import { z } from "zod";

import { optionalWholeNumberText, wholeNumberText } from "@/lib/formFields";

const MAX_ACTIVITY_XP_AMOUNT = 1_000_000;
const MAX_ACTIVITY_LIMIT = 1_000_000;
const MIN_ACTIVITY_LIMIT = 1;

const optionalActivityLimitText = () =>
  optionalWholeNumberText()
    .refine((raw) => raw === "" || Number(raw) >= MIN_ACTIVITY_LIMIT, {
      message: `Use a number that is at least ${MIN_ACTIVITY_LIMIT}, or leave blank for no limit.`,
    })
    .refine((raw) => raw === "" || Number(raw) <= MAX_ACTIVITY_LIMIT, {
      message: `Use a number up to ${MAX_ACTIVITY_LIMIT.toLocaleString()}.`,
    });

export const activityConfigFormSchema = z.object({
  enabled: z.boolean(),
  xpAmount: wholeNumberText("an XP amount", { max: MAX_ACTIVITY_XP_AMOUNT }),
  dailyLimit: optionalActivityLimitText(),
  cooldownSeconds: optionalActivityLimitText(),
  maxPerEntity: optionalActivityLimitText(),
});
