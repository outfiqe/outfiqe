import {
  LEADERBOARD_CATEGORY,
  type LeaderboardCategory,
} from "#constants/leaderboard.constants.js";

export {
  currentIsoWeekKey,
  currentIsoWeekStart,
  nextIsoWeekStart,
  previousIsoWeekKey,
} from "#lib/iso-week.utils.js";

export const formatScoreLabel = (category: LeaderboardCategory, score: number): string => {
  switch (category) {
    case LEADERBOARD_CATEGORY.TRENDING:
      return `${Math.round(score)} pts`;
    case LEADERBOARD_CATEGORY.MOST_PURCHASED:
      return `${Math.round(score)} sold`;
    case LEADERBOARD_CATEGORY.MOST_LOVED:
      return `${Math.round(score)} new followers`;
    case LEADERBOARD_CATEGORY.FASTEST_GROWING:
      return `${score >= 0 ? "+" : ""}${Math.round(score)}%`;
  }
};
