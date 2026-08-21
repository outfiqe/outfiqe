import type { LeaderboardCategory } from "#constants/leaderboard.constants.js";
import type { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";

export const redisKeys = {
  rateLimit: (namespace: string, identifier: string) => `ratelimit:${namespace}:${identifier}`,
  cache: (namespace: string, identifier = "all") => `cache:${namespace}:${identifier}`,
  stream: (event: string) => `stream:${event}`,
  lock: (name: string) => `lock:${name}`,
  leaderboard: (category: LeaderboardCategory, week: string) =>
    `leaderboard:brand:${category}:${week}`,
  creatorLeaderboard: (category: CreatorLeaderboardCategory, week: string) =>
    `leaderboard:creator:${category}:${week}`,
};

export const CACHE_TTL = {
  CATEGORIES_PUBLIC: 300,
  HERO_SLIDES_PUBLIC: 300,
  TRENDING_TAGS: 600,
  EXPLORE_TRENDING_SNAPSHOT: 1200,
  EXPLORE_TRENDING_SCORE: 2400,
  DELIVERY_ZONES_PUBLIC: 300,
  PRODUCT_TRENDING: 2400,
  PRODUCT_TRENDING_SNAPSHOT: 1200,
  PRODUCT_AUTOCOMPLETE: 120,
  CREATOR_AUTOCOMPLETE: 120,
  LOOK_AUTOCOMPLETE: 120,
} as const;
