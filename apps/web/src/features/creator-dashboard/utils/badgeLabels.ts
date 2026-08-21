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
  posts_created: "Posts created",
  total_likes: "Total likes",
  comments_made: "Comments made",
  purchases_count: "Purchases",
  sales_count: "Sales generated",
  total_views: "Total views",
};
