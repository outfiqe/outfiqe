import type { LeaderboardCategory } from "#constants/leaderboard.constants.js";
import type { LeaderboardEntry } from "#socket/socket.types.js";

export type { LeaderboardCategory, LeaderboardEntry };

export type LeaderboardSnapshot = {
  category: LeaderboardCategory;
  week: string;
  entries: LeaderboardEntry[];
};

export type ZsetMember = { member: string; score: number };

export type BrandPurchaseTotal = { brandId: string; totalUnits: number };
