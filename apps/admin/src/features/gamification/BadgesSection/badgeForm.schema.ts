import { z } from "zod";

import {
  badgeDescriptionText,
  badgeIconText,
  badgeNameText,
  badgeXpRewardText,
  isEndAfterStart,
  optionalAssignmentLimitText,
} from "../badgeFormFields.schema";
import { conditionsSchema } from "../conditions/conditionForm.schema";

const sharedBadgeFields = {
  name: badgeNameText("a badge name"),
  description: badgeDescriptionText("a description"),
  icon: badgeIconText(),
  xpReward: badgeXpRewardText(),
};

const adminAwardBadgeSchema = z.object({
  ...sharedBadgeFields,
  assignmentLimit: optionalAssignmentLimitText(),
});

const ruleBasedBadgeSchema = z
  .object({
    ...sharedBadgeFields,
    conditions: conditionsSchema,
    activeFrom: z.string(),
    activeUntil: z.string(),
  })
  .refine((values) => isEndAfterStart(values.activeFrom, values.activeUntil), {
    message: "The season must end after it starts.",
    path: ["activeUntil"],
  });

export const pickBadgeFormSchema = (isAdminAward: boolean) =>
  isAdminAward ? adminAwardBadgeSchema : ruleBasedBadgeSchema;
