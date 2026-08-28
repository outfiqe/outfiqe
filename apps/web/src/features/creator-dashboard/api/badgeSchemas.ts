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

const LAYER_ID_MAX_LENGTH = 64;
const LAYER_GLYPH_MAX_LENGTH = 8;
const LAYER_TEXT_MAX_LENGTH = 40;
const LAYER_IMAGE_URL_MAX_LENGTH = 2048;
const MAX_BADGE_LAYERS = 12;
const MIN_LAYER_PERCENT = 0;
const MAX_LAYER_PERCENT = 100;
const MIN_LAYER_FONT_SIZE = 5;
const MAX_LAYER_FONT_SIZE = 100;
const MAX_LAYER_BORDER_WIDTH = 8;
const MAX_LAYER_RADIUS = 100;

export const BadgeImageFit = { CONTAIN: "contain", COVER: "cover" } as const;
export type BadgeImageFitValue = (typeof BadgeImageFit)[keyof typeof BadgeImageFit];

const badgeLayerBaseFields = {
  id: z.string().trim().min(1).max(LAYER_ID_MAX_LENGTH),
  x: z.number().min(MIN_LAYER_PERCENT).max(MAX_LAYER_PERCENT),
  y: z.number().min(MIN_LAYER_PERCENT).max(MAX_LAYER_PERCENT),
  width: z.number().min(MIN_LAYER_PERCENT).max(MAX_LAYER_PERCENT),
  height: z.number().min(MIN_LAYER_PERCENT).max(MAX_LAYER_PERCENT),
};

export const badgeLayerSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...badgeLayerBaseFields,
      type: z.literal("background"),
      shape: z.enum(BadgeShape),
      fill: z.string(),
      borderColor: z.string().optional(),
      borderWidth: z.number().min(0).max(MAX_LAYER_BORDER_WIDTH).optional(),
    })
    .strict(),
  z
    .object({
      ...badgeLayerBaseFields,
      type: z.literal("icon"),
      glyph: z.string().trim().min(1).max(LAYER_GLYPH_MAX_LENGTH),
      fontSize: z.number().min(MIN_LAYER_FONT_SIZE).max(MAX_LAYER_FONT_SIZE),
    })
    .strict(),
  z
    .object({
      ...badgeLayerBaseFields,
      type: z.literal("text"),
      content: z.string().trim().min(1).max(LAYER_TEXT_MAX_LENGTH),
      color: z.string(),
      fontSize: z.number().min(MIN_LAYER_FONT_SIZE).max(MAX_LAYER_FONT_SIZE),
      fontWeight: z.enum(["normal", "bold"]),
    })
    .strict(),
  z
    .object({
      ...badgeLayerBaseFields,
      type: z.literal("image"),
      url: z.string().trim().min(1).max(LAYER_IMAGE_URL_MAX_LENGTH),
      fit: z.enum(BadgeImageFit),
      radius: z.number().min(0).max(MAX_LAYER_RADIUS).optional(),
    })
    .strict(),
]);
export type BadgeLayer = z.infer<typeof badgeLayerSchema>;

const legacyBadgeDesignConfigSchema = z
  .object({
    shape: z.enum(BadgeShape),
    primaryColor: z.string(),
    imageUrl: z.string().trim().min(1).max(LAYER_IMAGE_URL_MAX_LENGTH).optional(),
    animation: z.enum(BadgeAnimation).optional(),
  })
  .strict();

const studioBadgeDesignConfigSchema = z
  .object({
    version: z.literal(2),
    animation: z.enum(BadgeAnimation).optional(),
    layers: z.array(badgeLayerSchema).min(1).max(MAX_BADGE_LAYERS),
  })
  .strict();

export const badgeDesignConfigSchema = z.union([
  legacyBadgeDesignConfigSchema,
  studioBadgeDesignConfigSchema,
]);
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

export const featuredBadgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  designConfig: badgeDesignConfigSchema,
  rarity: z.enum(BadgeRarity),
});
export type FeaturedBadge = z.infer<typeof featuredBadgeSchema>;
