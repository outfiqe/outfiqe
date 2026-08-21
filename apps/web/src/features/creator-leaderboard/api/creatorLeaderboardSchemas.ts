import { z } from "zod";

import { CREATOR_LEADERBOARD_CATEGORY } from "../creatorLeaderboard.constants";

export const creatorLeaderboardEntrySchema = z.object({
  rank: z.number(),
  creatorId: z.string(),
  creatorName: z.string(),
  creatorHandle: z.string(),
  avatarUrl: z.string().nullable(),
  score: z.number(),
  scoreLabel: z.string(),
  movement: z.number().nullable(),
});
export type CreatorLeaderboardEntry = z.infer<typeof creatorLeaderboardEntrySchema>;

export const creatorLeaderboardSnapshotSchema = z.object({
  category: z.enum(CREATOR_LEADERBOARD_CATEGORY),
  week: z.string(),
  isEnabled: z.boolean(),
  entries: z.array(creatorLeaderboardEntrySchema),
});
export type CreatorLeaderboardSnapshot = z.infer<typeof creatorLeaderboardSnapshotSchema>;

export const creatorLeaderboardCategoryStateSchema = z.object({
  category: z.enum(CREATOR_LEADERBOARD_CATEGORY),
  enabled: z.boolean(),
});
export type CreatorLeaderboardCategoryState = z.infer<typeof creatorLeaderboardCategoryStateSchema>;

export const creatorLeaderboardCategoryListSchema = z.array(creatorLeaderboardCategoryStateSchema);
