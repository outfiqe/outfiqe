import type {
  BadgeAnimationValue,
  BadgeCategoryValue,
  BadgeImageFitValue,
  BadgeRarityValue,
  BadgeShapeValue,
  CreatorLeaderboardCategoryValue,
} from "./schemas";

export const CATEGORY_OPTIONS: BadgeCategoryValue[] = [
  "BEGINNER",
  "CREATOR",
  "COMMUNITY",
  "ENGAGEMENT",
  "COMMERCE",
  "SPECIAL",
];

export const RARITY_OPTIONS: BadgeRarityValue[] = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "EXCLUSIVE",
];

export const SHAPE_OPTIONS: BadgeShapeValue[] = ["circle", "shield", "star", "diamond", "hexagon"];

export const AUTO_ANIMATION_OPTION = "auto" as const;

export const BADGE_DESIGN_MODE = {
  SIMPLE: "simple",
  STUDIO: "studio",
} as const;

export const IMAGE_FIT_OPTIONS: BadgeImageFitValue[] = ["contain", "cover"];

export const IMAGE_FIT_OPTION_LABEL: Record<BadgeImageFitValue, string> = {
  contain: "Fit inside",
  cover: "Fill",
};

export const BADGE_ICON_IMAGE_ACCEPT = "image/png,image/jpeg,image/svg+xml";

export const DEFAULT_BADGE_ICON = "🏆";

export const ANIMATION_OPTIONS: BadgeAnimationValue[] = [
  "none",
  "glow",
  "shimmer",
  "pulse",
  "radiant",
];

export const ANIMATION_OPTION_LABEL: Record<BadgeAnimationValue, string> = {
  none: "None",
  glow: "Glow",
  shimmer: "Shimmer",
  pulse: "Pulse",
  radiant: "Radiant",
};

export const RULE_BASED_REQUIREMENT_TYPES = [
  "MILESTONE",
  "ACTIVITY",
  "ENGAGEMENT",
  "COMMERCE",
  "COMMUNITY",
  "LEVEL",
  "SPECIAL",
] as const;

export const LEADERBOARD_CATEGORY_OPTIONS: CreatorLeaderboardCategoryValue[] = [
  "TOP_XP",
  "TOP_CREATOR",
  "MOST_LIKES",
  "MOST_ENGAGED",
  "TOP_SELLER",
  "RISING_CREATOR",
  "MOST_ACHIEVEMENTS",
];

export const LEADERBOARD_CATEGORY_LABEL: Record<CreatorLeaderboardCategoryValue, string> = {
  TOP_XP: "Top XP",
  TOP_CREATOR: "Top Creator",
  MOST_LIKES: "Most Likes",
  MOST_ENGAGED: "Most Engaged",
  TOP_SELLER: "Top Seller",
  RISING_CREATOR: "Rising Creator",
  MOST_ACHIEVEMENTS: "Most Achievements",
};
