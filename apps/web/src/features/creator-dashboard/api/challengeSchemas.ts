import { z } from "zod";

import {
  BadgeCategory,
  badgeConditionProgressSchema,
  badgeDesignConfigSchema,
  BadgeRarity,
} from "./badgeSchemas";

export const challengeStatusSchema = z.enum(["UPCOMING", "OPEN", "ENDED"]);
export type ChallengeStatus = z.infer<typeof challengeStatusSchema>;

export const challengeBadgePreviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  category: z.enum(BadgeCategory),
  rarity: z.enum(BadgeRarity),
  xpReward: z.number(),
  designConfig: badgeDesignConfigSchema,
});

export const publicChallengeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bannerImageUrl: z.string().nullable(),
  status: challengeStatusSchema,
  activeFrom: z.string().nullable(),
  activeUntil: z.string().nullable(),
  badge: challengeBadgePreviewSchema,
  isCompleted: z.boolean().nullable(),
  conditions: z.array(badgeConditionProgressSchema).nullable(),
});
export type PublicChallenge = z.infer<typeof publicChallengeSchema>;

export const publicChallengeListSchema = z.array(publicChallengeSchema);
