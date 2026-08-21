import { z } from "zod";

import { AchievementRequirementType, BadgeCategory, BadgeRarity } from "#generated/prisma/enums.js";
import { achievementConditionSchema } from "#modules/achievements/achievement.schemas.js";

import { BADGE_SHAPE, MAX_FEATURED_BADGES } from "./badge.constants.js";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;
const ICON_MAX_LENGTH = 8;
const REASON_MAX_LENGTH = 500;

const RULE_BASED_REQUIREMENT_TYPES = Object.values(AchievementRequirementType).filter(
  (type): type is Exclude<AchievementRequirementType, "ADMIN_AWARD"> =>
    type !== AchievementRequirementType.ADMIN_AWARD,
);

export const badgeDesignConfigSchema = z.object({
  shape: z.enum(BADGE_SHAPE),
  primaryColor: z.string(),
});

export const badgeIdParamSchema = z.object({
  badgeId: z.uuid(),
});

export const updateBadgeDisplaySchema = z.object({
  isDisplayed: z.boolean(),
});

const hasNoDuplicateBadgeIds = (badgeIds: string[]) => new Set(badgeIds).size === badgeIds.length;

export const updateFeaturedBadgesSchema = z.object({
  badgeIds: z
    .array(z.uuid())
    .max(MAX_FEATURED_BADGES)
    .refine(hasNoDuplicateBadgeIds, { message: "Each badge can only be featured once." }),
});

export const updateTitleBadgeSchema = z.object({
  badgeId: z.uuid().nullable(),
});

const badgeCoreFields = {
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  description: z.string().trim().min(1).max(DESCRIPTION_MAX_LENGTH),
  category: z.enum(BadgeCategory),
  rarity: z.enum(BadgeRarity),
  icon: z.string().trim().min(1).max(ICON_MAX_LENGTH),
  designConfig: badgeDesignConfigSchema,
  xpReward: z.number().int().nonnegative(),
  isPermanent: z.boolean(),
  isPublic: z.boolean(),
  isTitleEligible: z.boolean(),
  assignmentLimit: z.number().int().positive().nullable(),
};

export const createBadgeSchema = z.discriminatedUnion("requirementType", [
  z
    .object({
      ...badgeCoreFields,
      requirementType: z.literal(AchievementRequirementType.ADMIN_AWARD),
    })
    .strict(),
  z
    .object({
      ...badgeCoreFields,
      requirementType: z.enum(RULE_BASED_REQUIREMENT_TYPES),
      conditions: z.array(achievementConditionSchema).min(1),
    })
    .strict(),
]);

export const updateBadgeSchema = z.discriminatedUnion("requirementType", [
  z
    .object({
      ...badgeCoreFields,
      requirementType: z.literal(AchievementRequirementType.ADMIN_AWARD),
      isActive: z.boolean(),
    })
    .strict(),
  z
    .object({
      ...badgeCoreFields,
      requirementType: z.enum(RULE_BASED_REQUIREMENT_TYPES),
      conditions: z.array(achievementConditionSchema).min(1),
      isActive: z.boolean(),
    })
    .strict(),
]);

export const awardBadgeSchema = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
});

export const userBadgeIdParamSchema = z.object({
  userBadgeId: z.uuid(),
});

export const removeUserBadgeSchema = z.object({
  reason: z.string().trim().min(1).max(REASON_MAX_LENGTH),
});

export type BadgeDesignConfig = z.infer<typeof badgeDesignConfigSchema>;
export type BadgeIdParam = z.infer<typeof badgeIdParamSchema>;
export type UpdateBadgeDisplayBody = z.infer<typeof updateBadgeDisplaySchema>;
export type UpdateFeaturedBadgesBody = z.infer<typeof updateFeaturedBadgesSchema>;
export type UpdateTitleBadgeBody = z.infer<typeof updateTitleBadgeSchema>;
export type CreateBadgeBody = z.infer<typeof createBadgeSchema>;
export type UpdateBadgeBody = z.infer<typeof updateBadgeSchema>;
export type AwardBadgeBody = z.infer<typeof awardBadgeSchema>;
export type UserBadgeIdParam = z.infer<typeof userBadgeIdParamSchema>;
export type RemoveUserBadgeBody = z.infer<typeof removeUserBadgeSchema>;
