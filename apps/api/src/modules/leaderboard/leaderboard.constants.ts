import { millisecondsInMinute } from "date-fns/constants";

import {
  LEADERBOARD_CATEGORY,
  type LeaderboardCategory,
} from "#constants/leaderboard.constants.js";

export const LEADERBOARD_TOP_N = 10;

export const MOST_PURCHASED_RECOMPUTE_INTERVAL_MS = 15 * millisecondsInMinute;
export const TRENDING_RECOMPUTE_INTERVAL_MS = 30 * millisecondsInMinute;
export const FASTEST_GROWING_RECOMPUTE_INTERVAL_MS = 15 * millisecondsInMinute;

export const LEADERBOARD_KEY_RETENTION_SECONDS = 14 * 24 * 60 * 60;

export const FASTEST_GROWING_SURGE_SCORE = 999;

export const RECOMPUTE_BASED_CATEGORIES = new Set<LeaderboardCategory>([
  LEADERBOARD_CATEGORY.MOST_PURCHASED,
  LEADERBOARD_CATEGORY.TRENDING,
  LEADERBOARD_CATEGORY.FASTEST_GROWING,
]);
