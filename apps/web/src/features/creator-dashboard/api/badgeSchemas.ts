import type {
  BadgeAnimation as BadgeAnimationType,
  BadgeCategory as BadgeCategoryType,
  BadgeRarity as BadgeRarityType,
  BadgeShape as BadgeShapeType,
} from "@outfiqe/types";
import { z } from "zod";

export const BadgeCategory = {
  BEGINNER: "BEGINNER",
  CREATOR: "CREATOR",
  COMMUNITY: "COMMUNITY",
  ENGAGEMENT: "ENGAGEMENT",
  COMMERCE: "COMMERCE",
  SPECIAL: "SPECIAL",
} as const satisfies Record<string, BadgeCategoryType>;
export type BadgeCategoryValue = (typeof BadgeCategory)[keyof typeof BadgeCategory];

export const BadgeRarity = {
  COMMON: "COMMON",
  UNCOMMON: "UNCOMMON",
  RARE: "RARE",
  EPIC: "EPIC",
  LEGENDARY: "LEGENDARY",
  EXCLUSIVE: "EXCLUSIVE",
} as const satisfies Record<string, BadgeRarityType>;
export type BadgeRarityValue = (typeof BadgeRarity)[keyof typeof BadgeRarity];

export const BadgeShape = {
  CIRCLE: "circle",
  SHIELD: "shield",
  STAR: "star",
  DIAMOND: "diamond",
  HEXAGON: "hexagon",
} as const satisfies Record<string, BadgeShapeType>;
export type BadgeShapeValue = (typeof BadgeShape)[keyof typeof BadgeShape];

export const BadgeAnimation = {
  NONE: "none",
  GLOW: "glow",
  SHIMMER: "shimmer",
  PULSE: "pulse",
  RADIANT: "radiant",
} as const satisfies Record<string, BadgeAnimationType>;
export type BadgeAnimationValue = (typeof BadgeAnimation)[keyof typeof BadgeAnimation];

export const badgeDesignConfigSchema = z.object({
  shape: z.enum(BadgeShape),
  primaryColor: z.string(),
  animation: z.enum(BadgeAnimation).optional(),
});
export type BadgeDesignConfig = z.infer<typeof badgeDesignConfigSchema>;

export const badgeConditionProgressSchema = z.object({
  metric: z.string(),
  operator: z.string(),
  value: z.number(),
  currentValue: z.number(),
});
export type BadgeConditionProgress = z.infer<typeof badgeConditionProgressSchema>;

export const sponsorBrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});
export type SponsorBrand = z.infer<typeof sponsorBrandSchema>;

export const badgeCollectionEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(BadgeCategory),
  rarity: z.enum(BadgeRarity),
  icon: z.string(),
  designConfig: badgeDesignConfigSchema,
  isPermanent: z.boolean(),
  isCollected: z.boolean(),
  unlockedAt: z.string().nullable(),
  isDisplayed: z.boolean().nullable(),
  isFeatured: z.boolean().nullable(),
  displayOrder: z.number().nullable(),
  isDynamicallyActive: z.boolean().nullable(),
  progress: z.array(badgeConditionProgressSchema).nullable(),
  sponsorBrand: sponsorBrandSchema.nullable(),
});
export type BadgeCollectionEntry = z.infer<typeof badgeCollectionEntrySchema>;

export const badgeCollectionSchema = z.array(badgeCollectionEntrySchema);
