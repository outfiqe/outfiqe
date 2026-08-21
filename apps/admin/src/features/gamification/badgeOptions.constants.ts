import type {
  BadgeAnimationValue,
  BadgeCategoryValue,
  BadgeRarityValue,
  BadgeShapeValue,
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
