import { z } from "zod";

import { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";

export const listCreatorLeaderboardQuerySchema = z.object({
  category: z.enum(CreatorLeaderboardCategory).default(CreatorLeaderboardCategory.TOP_XP),
});

export const creatorLeaderboardCategoryParamSchema = z.object({
  category: z.enum(CreatorLeaderboardCategory),
});

export const updateCreatorLeaderboardCategorySchema = z.object({
  enabled: z.boolean(),
});

export type ListCreatorLeaderboardQuery = z.infer<typeof listCreatorLeaderboardQuerySchema>;
export type CreatorLeaderboardCategoryParam = z.infer<typeof creatorLeaderboardCategoryParamSchema>;
export type UpdateCreatorLeaderboardCategoryBody = z.infer<
  typeof updateCreatorLeaderboardCategorySchema
>;
