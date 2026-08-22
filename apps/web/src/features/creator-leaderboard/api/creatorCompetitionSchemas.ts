import { z } from "zod";

import {
  badgeDesignConfigSchema,
  BadgeRarity,
} from "@/features/creator-dashboard/api/badgeSchemas";

import { CREATOR_LEADERBOARD_CATEGORY } from "../creatorLeaderboard.constants";

export const creatorCompetitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(CREATOR_LEADERBOARD_CATEGORY),
  topN: z.number(),
  badge: z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string(),
    rarity: z.enum(BadgeRarity),
    designConfig: badgeDesignConfigSchema,
  }),
});
export type CreatorCompetition = z.infer<typeof creatorCompetitionSchema>;

export const creatorCompetitionListSchema = z.array(creatorCompetitionSchema);
