import type { BadgeCategoryValue, BadgeRarityValue, BadgeShapeValue } from "./schemas";

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

export const RULE_BASED_REQUIREMENT_TYPES = [
  "MILESTONE",
  "ACTIVITY",
  "ENGAGEMENT",
  "COMMERCE",
  "COMMUNITY",
  "LEVEL",
  "SPECIAL",
] as const;
