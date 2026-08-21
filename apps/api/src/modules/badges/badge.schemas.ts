import { z } from "zod";

import { BADGE_SHAPE, MAX_FEATURED_BADGES } from "./badge.constants.js";

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

export type BadgeDesignConfig = z.infer<typeof badgeDesignConfigSchema>;
export type BadgeIdParam = z.infer<typeof badgeIdParamSchema>;
export type UpdateBadgeDisplayBody = z.infer<typeof updateBadgeDisplaySchema>;
export type UpdateFeaturedBadgesBody = z.infer<typeof updateFeaturedBadgesSchema>;
export type UpdateTitleBadgeBody = z.infer<typeof updateTitleBadgeSchema>;
