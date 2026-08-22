import type { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";
import type { CreatorLeaderboardEntry } from "#socket/socket.types.js";

export type { CreatorLeaderboardCategory, CreatorLeaderboardEntry };

export type CreatorLeaderboardSnapshot = {
  category: CreatorLeaderboardCategory;
  week: string;
  isEnabled: boolean;
  entries: CreatorLeaderboardEntry[];
};

export type ZsetMember = { member: string; score: number };

export type CreatorStatsRow = {
  creatorId: string;
  totalXp: number;
  followerCount: number;
  totalLikes: number;
  totalEngagement: number;
  totalSales: number;
  achievementCount: number;
};

export type CreatorLeaderboardCategoryState = {
  category: CreatorLeaderboardCategory;
  enabled: boolean;
};
