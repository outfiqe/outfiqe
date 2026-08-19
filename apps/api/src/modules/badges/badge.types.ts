import type { BadgeCategory, BadgeRarity } from "#generated/prisma/enums.js";
import type { AchievementConditionProgress } from "#modules/achievements/achievement.types.js";

import type { BadgeDesignConfig } from "./badge.schemas.js";

export type BadgeCatalogRecord = {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  icon: string;
  designConfig: unknown;
  isPermanent: boolean;
  isDynamic: boolean;
  isPublic: boolean;
};

export type UserBadgeStateRecord = {
  badgeId: string;
  isDisplayed: boolean;
  isFeatured: boolean;
  displayOrder: number;
  unlockedAt: Date;
};

export type FeaturedBadgeRecord = {
  id: string;
  name: string;
  icon: string;
  designConfig: unknown;
  rarity: BadgeRarity;
};

export type BadgeCollectionEntry = {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  icon: string;
  designConfig: BadgeDesignConfig;
  isPermanent: boolean;
  isCollected: boolean;
  unlockedAt: string | null;
  isDisplayed: boolean | null;
  isFeatured: boolean | null;
  displayOrder: number | null;
  progress: AchievementConditionProgress[] | null;
};

export type FeaturedBadgeView = {
  id: string;
  name: string;
  icon: string;
  designConfig: BadgeDesignConfig;
  rarity: BadgeRarity;
};
