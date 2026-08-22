import { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";

import {
  GROWTH_PERCENT_MULTIPLIER,
  RISING_CREATOR_SURGE_SCORE,
  TOP_CREATOR_FOLLOWER_WEIGHT,
} from "./creatorLeaderboard.constants.js";
import type { CreatorStatsRow, ZsetMember } from "./creatorLeaderboard.types.js";

export const formatCreatorScoreLabel = (
  category: CreatorLeaderboardCategory,
  score: number,
): string => {
  switch (category) {
    case CreatorLeaderboardCategory.TOP_XP:
      return `${Math.round(score).toLocaleString()} XP`;
    case CreatorLeaderboardCategory.TOP_CREATOR:
      return `${Math.round(score).toLocaleString()} pts`;
    case CreatorLeaderboardCategory.MOST_LIKES:
      return `${Math.round(score).toLocaleString()} likes`;
    case CreatorLeaderboardCategory.MOST_ENGAGED:
      return `${Math.round(score).toLocaleString()} interactions`;
    case CreatorLeaderboardCategory.TOP_SELLER:
      return `Rs. ${Math.round(score).toLocaleString()} earned`;
    case CreatorLeaderboardCategory.RISING_CREATOR:
      return `${score >= 0 ? "+" : ""}${Math.round(score)}%`;
    case CreatorLeaderboardCategory.MOST_ACHIEVEMENTS:
      return `${Math.round(score).toLocaleString()} badges`;
  }
};

export const scoreForCategory = (
  category: CreatorLeaderboardCategory,
  stats: CreatorStatsRow,
): number => {
  switch (category) {
    case CreatorLeaderboardCategory.TOP_XP:
      return stats.totalXp;
    case CreatorLeaderboardCategory.TOP_CREATOR:
      return stats.totalXp + stats.followerCount * TOP_CREATOR_FOLLOWER_WEIGHT;
    case CreatorLeaderboardCategory.MOST_LIKES:
      return stats.totalLikes;
    case CreatorLeaderboardCategory.MOST_ENGAGED:
      return stats.totalEngagement;
    case CreatorLeaderboardCategory.TOP_SELLER:
      return stats.totalSales;
    case CreatorLeaderboardCategory.MOST_ACHIEVEMENTS:
      return stats.achievementCount;
    case CreatorLeaderboardCategory.RISING_CREATOR:
      return 0;
  }
};

export const deriveGrowthScore = (currentXp: number, previousXp: number): number =>
  previousXp > 0
    ? ((currentXp - previousXp) / previousXp) * GROWTH_PERCENT_MULTIPLIER
    : RISING_CREATOR_SURGE_SCORE;

export const toZsetMembers = (raw: string[]): ZsetMember[] => {
  const entries: ZsetMember[] = [];
  for (let index = 0; index + 1 < raw.length; index += 2) {
    const member = raw[index];
    const scoreRaw = raw[index + 1];
    if (member === undefined || scoreRaw === undefined) continue;
    entries.push({ member, score: Number(scoreRaw) });
  }
  return entries;
};
