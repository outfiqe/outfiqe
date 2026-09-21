import { z } from "zod";

import {
  badgeDescriptionText,
  badgeNameText,
  badgeXpRewardText,
  isEndAfterStart,
  requiredBadgeIconText,
} from "../badgeFormFields.schema";
import { conditionsSchema } from "../conditions/conditionForm.schema";

export const challengeFormSchema = z
  .object({
    challengeName: badgeNameText("a challenge name"),
    challengeDescription: badgeDescriptionText("a challenge description"),
    activeFrom: z.string().min(1, "Choose when the challenge starts."),
    activeUntil: z.string().min(1, "Choose when the challenge ends."),
    name: badgeNameText("a badge name"),
    icon: requiredBadgeIconText(),
    description: badgeDescriptionText("a badge description"),
    xpReward: badgeXpRewardText(),
    conditions: conditionsSchema,
  })
  .refine((values) => isEndAfterStart(values.activeFrom, values.activeUntil), {
    message: "The challenge must end after it starts.",
    path: ["activeUntil"],
  });
