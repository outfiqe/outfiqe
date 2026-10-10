import type { LeaderboardCategory as LeaderboardCategoryType } from "@outfiqe/types";

export const LEADERBOARD_QUERY_PARAM = "category";

export const LEADERBOARD_CATEGORY = {
  TRENDING: "trending",
  MOST_PURCHASED: "most-purchased",
  MOST_LOVED: "most-loved",
  FASTEST_GROWING: "fastest-growing",
} as const satisfies Record<string, LeaderboardCategoryType>;

export type LeaderboardCategory = (typeof LEADERBOARD_CATEGORY)[keyof typeof LEADERBOARD_CATEGORY];

export type LeaderboardTab = { value: LeaderboardCategory; label: string };

export const LEADERBOARD_TABS: LeaderboardTab[] = [
  { value: LEADERBOARD_CATEGORY.TRENDING, label: "Trending" },
  { value: LEADERBOARD_CATEGORY.MOST_PURCHASED, label: "Most purchased" },
  { value: LEADERBOARD_CATEGORY.MOST_LOVED, label: "Most loved" },
  { value: LEADERBOARD_CATEGORY.FASTEST_GROWING, label: "Fastest growing" },
];

const LEADERBOARD_CATEGORIES: readonly LeaderboardCategory[] = Object.values(LEADERBOARD_CATEGORY);

export const isLeaderboardCategory = (value: string): value is LeaderboardCategory =>
  LEADERBOARD_CATEGORIES.some((category) => category === value);

export const LEADERBOARD_SOCKET_EVENTS = {
  UPDATED: "leaderboard:updated",
  SUBSCRIBE: "leaderboard:subscribe",
  UNSUBSCRIBE: "leaderboard:unsubscribe",
} as const;
