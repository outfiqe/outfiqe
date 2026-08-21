import { z } from "zod";

import { achievementConditionSchema } from "#modules/achievements/achievement.schemas.js";
import { badgeCoreFields, RULE_BASED_REQUIREMENT_TYPES } from "#modules/badges/badge.schemas.js";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

const hasWindowThatMakesSense = (data: { activeFrom: string; activeUntil: string }) =>
  data.activeFrom < data.activeUntil;

const challengeCopyFields = {
  challengeName: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  challengeDescription: z.string().trim().min(1).max(DESCRIPTION_MAX_LENGTH),
  bannerImageUrl: z.url().nullable(),
};

const {
  assignmentLimit: _assignmentLimit,
  isDynamic: _isDynamic,
  ...challengeBadgeFields
} = badgeCoreFields;

export const createChallengeSchema = z
  .object({
    ...challengeBadgeFields,
    ...challengeCopyFields,
    requirementType: z.enum(RULE_BASED_REQUIREMENT_TYPES),
    conditions: z.array(achievementConditionSchema).min(1),
    activeFrom: z.iso.datetime(),
    activeUntil: z.iso.datetime(),
  })
  .strict()
  .refine(hasWindowThatMakesSense, {
    message: "The challenge must end after it starts.",
    path: ["activeUntil"],
  });

export const updateChallengeSchema = z
  .object({
    ...challengeBadgeFields,
    ...challengeCopyFields,
    requirementType: z.enum(RULE_BASED_REQUIREMENT_TYPES),
    conditions: z.array(achievementConditionSchema).min(1),
    activeFrom: z.iso.datetime(),
    activeUntil: z.iso.datetime(),
    isActive: z.boolean(),
    achievementIsActive: z.boolean(),
  })
  .strict()
  .refine(hasWindowThatMakesSense, {
    message: "The challenge must end after it starts.",
    path: ["activeUntil"],
  });

export const challengeIdParamSchema = z.object({
  challengeId: z.uuid(),
});

export type CreateChallengeBody = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeBody = z.infer<typeof updateChallengeSchema>;
export type ChallengeIdParam = z.infer<typeof challengeIdParamSchema>;
