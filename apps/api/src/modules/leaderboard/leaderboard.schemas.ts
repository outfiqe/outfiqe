import { z } from "zod";

import { LEADERBOARD_CATEGORY } from "#constants/leaderboard.constants.js";

export const listLeaderboardQuerySchema = z.object({
  category: z.enum(LEADERBOARD_CATEGORY).default(LEADERBOARD_CATEGORY.TRENDING),
});

export type ListLeaderboardQuery = z.infer<typeof listLeaderboardQuerySchema>;
