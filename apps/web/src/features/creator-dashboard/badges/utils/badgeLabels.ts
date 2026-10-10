import { BadgeRarity } from "../api/badgeSchemas";

export const RARITY_LABEL: Record<string, string> = {
  [BadgeRarity.COMMON]: "Common",
  [BadgeRarity.UNCOMMON]: "Uncommon",
  [BadgeRarity.RARE]: "Rare",
  [BadgeRarity.EPIC]: "Epic",
  [BadgeRarity.LEGENDARY]: "Legendary",
  [BadgeRarity.EXCLUSIVE]: "Exclusive",
};

export const METRIC_LABEL: Record<string, string> = {
  level: "Level",
  posts_created: "Drops created",
  total_likes: "Total cheriqs",
  comments_made: "Chimes made",
  purchases_count: "Purchases",
  sales_count: "Sales generated",
  total_views: "Total views",
  top_xp_rank: "Top XP rank",
  top_creator_rank: "Top muse rank",
  most_likes_rank: "Most cheriqs rank",
  most_engaged_rank: "Most engaged rank",
  top_seller_rank: "Top seller rank",
  rising_creator_rank: "Rising muse rank",
  most_achievements_rank: "Most achievements rank",
};

export const RANK_METRICS = new Set([
  "top_xp_rank",
  "top_creator_rank",
  "most_likes_rank",
  "most_engaged_rank",
  "top_seller_rank",
  "rising_creator_rank",
  "most_achievements_rank",
]);

export const isRankMetric = (metric: string): boolean => RANK_METRICS.has(metric);
