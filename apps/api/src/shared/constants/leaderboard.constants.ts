import type { LeaderboardCategory as LeaderboardCategoryType } from "@outfiqe/types";

export const LEADERBOARD_CATEGORY = {
  TRENDING: "trending",
  MOST_PURCHASED: "most-purchased",
  MOST_LOVED: "most-loved",
  FASTEST_GROWING: "fastest-growing",
} as const satisfies Record<string, LeaderboardCategoryType>;

export type LeaderboardCategory = (typeof LEADERBOARD_CATEGORY)[keyof typeof LEADERBOARD_CATEGORY];
