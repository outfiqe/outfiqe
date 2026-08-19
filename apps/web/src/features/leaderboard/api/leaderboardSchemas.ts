import { z } from "zod";

import { LEADERBOARD_CATEGORY } from "../leaderboard.constants";

export const leaderboardEntrySchema = z.object({
  rank: z.number(),
  brandId: z.string(),
  brandName: z.string(),
  avatarUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  score: z.number(),
  scoreLabel: z.string(),
  movement: z.number().nullable(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const leaderboardSnapshotSchema = z.object({
  category: z.enum([
    LEADERBOARD_CATEGORY.TRENDING,
    LEADERBOARD_CATEGORY.MOST_PURCHASED,
    LEADERBOARD_CATEGORY.MOST_LOVED,
    LEADERBOARD_CATEGORY.FASTEST_GROWING,
  ]),
  week: z.string(),
  entries: z.array(leaderboardEntrySchema),
});
export type LeaderboardSnapshot = z.infer<typeof leaderboardSnapshotSchema>;
