import { z } from "zod";

export const badgeCategorySchema = z.enum([
  "BEGINNER",
  "CREATOR",
  "COMMUNITY",
  "ENGAGEMENT",
  "COMMERCE",
  "SPECIAL",
]);
export type BadgeCategoryValue = z.infer<typeof badgeCategorySchema>;

export const badgeRaritySchema = z.enum([
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "EXCLUSIVE",
]);
export type BadgeRarityValue = z.infer<typeof badgeRaritySchema>;

export const badgeShapeSchema = z.enum(["circle", "shield", "star", "diamond", "hexagon"]);
export type BadgeShapeValue = z.infer<typeof badgeShapeSchema>;

export const badgeAnimationSchema = z.enum(["none", "glow", "shimmer", "pulse", "radiant"]);
export type BadgeAnimationValue = z.infer<typeof badgeAnimationSchema>;

export const ADMIN_AWARD_REQUIREMENT_TYPE = "ADMIN_AWARD" as const;

export const achievementRequirementTypeSchema = z.enum([
  "MILESTONE",
  "ACTIVITY",
  "ENGAGEMENT",
  "COMMERCE",
  "COMMUNITY",
  "LEVEL",
  "SPECIAL",
  ADMIN_AWARD_REQUIREMENT_TYPE,
]);
export type AchievementRequirementTypeValue = z.infer<typeof achievementRequirementTypeSchema>;

export const ruleBasedRequirementTypeSchema = achievementRequirementTypeSchema.exclude([
  ADMIN_AWARD_REQUIREMENT_TYPE,
]);
export type RuleBasedRequirementTypeValue = z.infer<typeof ruleBasedRequirementTypeSchema>;

export const achievementMetricSchema = z.enum([
  "level",
  "posts_created",
  "purchases_count",
  "total_likes",
  "comments_made",
  "sales_count",
  "total_views",
  "top_xp_rank",
  "top_creator_rank",
  "most_likes_rank",
  "most_engaged_rank",
  "top_seller_rank",
  "rising_creator_rank",
  "most_achievements_rank",
]);
export type AchievementMetricValue = z.infer<typeof achievementMetricSchema>;

export const conditionOperatorSchema = z.enum(["gte", "gt", "eq", "lte", "lt"]);
export type ConditionOperatorValue = z.infer<typeof conditionOperatorSchema>;

export const achievementConditionSchema = z.object({
  metric: achievementMetricSchema,
  operator: conditionOperatorSchema,
  value: z.number(),
});
export type AchievementCondition = z.infer<typeof achievementConditionSchema>;

export const levelSchema = z.object({
  id: z.string(),
  level: z.number(),
  name: z.string(),
  requiredXp: z.number(),
  icon: z.string().nullable(),
  isActive: z.boolean(),
});
export type Level = z.infer<typeof levelSchema>;

export const xpMultiplierSchema = z.object({
  id: z.string(),
  label: z.string(),
  multiplier: z.number(),
  startsAt: z.string(),
  endsAt: z.string(),
  isActive: z.boolean(),
});
export type XpMultiplier = z.infer<typeof xpMultiplierSchema>;

export const activityXpConfigSchema = z.object({
  activityType: z.string(),
  enabled: z.boolean(),
  xpAmount: z.number(),
  dailyLimit: z.number().nullable(),
  cooldownSeconds: z.number().nullable(),
  maxPerEntity: z.number().nullable(),
});
export type ActivityXpConfig = z.infer<typeof activityXpConfigSchema>;

const LAYER_ID_MAX_LENGTH = 64;
const LAYER_GLYPH_MAX_LENGTH = 8;
const LAYER_TEXT_MAX_LENGTH = 40;
const LAYER_IMAGE_URL_MAX_LENGTH = 2048;
const MAX_BADGE_LAYERS = 12;
const MIN_LAYER_PERCENT = 0;
const MAX_LAYER_PERCENT = 100;
const MIN_LAYER_FONT_SIZE = 5;
const MAX_LAYER_FONT_SIZE = 100;
const MIN_LAYER_BORDER_WIDTH = 0;
const MAX_LAYER_BORDER_WIDTH = 8;
const MIN_LAYER_RADIUS = 0;
const MAX_LAYER_RADIUS = 100;

export const badgeImageFitSchema = z.enum(["contain", "cover"]);
export type BadgeImageFitValue = z.infer<typeof badgeImageFitSchema>;

export const badgeLayerTypeSchema = z.enum(["background", "icon", "text", "image"]);
export type BadgeLayerTypeValue = z.infer<typeof badgeLayerTypeSchema>;

const badgeLayerBaseFields = {
  id: z.string().trim().min(1).max(LAYER_ID_MAX_LENGTH),
  x: z.number().min(MIN_LAYER_PERCENT).max(MAX_LAYER_PERCENT),
  y: z.number().min(MIN_LAYER_PERCENT).max(MAX_LAYER_PERCENT),
  width: z.number().min(MIN_LAYER_PERCENT).max(MAX_LAYER_PERCENT),
  height: z.number().min(MIN_LAYER_PERCENT).max(MAX_LAYER_PERCENT),
};

export const badgeBackgroundLayerSchema = z.object({
  ...badgeLayerBaseFields,
  type: z.literal("background"),
  shape: badgeShapeSchema,
  fill: z.string(),
  borderColor: z.string().optional(),
  borderWidth: z.number().min(MIN_LAYER_BORDER_WIDTH).max(MAX_LAYER_BORDER_WIDTH).optional(),
});
export type BadgeBackgroundLayer = z.infer<typeof badgeBackgroundLayerSchema>;

export const badgeIconLayerSchema = z.object({
  ...badgeLayerBaseFields,
  type: z.literal("icon"),
  glyph: z.string().trim().min(1).max(LAYER_GLYPH_MAX_LENGTH),
  fontSize: z.number().min(MIN_LAYER_FONT_SIZE).max(MAX_LAYER_FONT_SIZE),
});
export type BadgeIconLayer = z.infer<typeof badgeIconLayerSchema>;

export const badgeTextLayerSchema = z.object({
  ...badgeLayerBaseFields,
  type: z.literal("text"),
  content: z.string().trim().min(1).max(LAYER_TEXT_MAX_LENGTH),
  color: z.string(),
  fontSize: z.number().min(MIN_LAYER_FONT_SIZE).max(MAX_LAYER_FONT_SIZE),
  fontWeight: z.enum(["normal", "bold"]),
});
export type BadgeTextLayer = z.infer<typeof badgeTextLayerSchema>;

export const badgeImageLayerSchema = z.object({
  ...badgeLayerBaseFields,
  type: z.literal("image"),
  url: z.string().trim().min(1).max(LAYER_IMAGE_URL_MAX_LENGTH),
  fit: badgeImageFitSchema,
  radius: z.number().min(MIN_LAYER_RADIUS).max(MAX_LAYER_RADIUS).optional(),
});
export type BadgeImageLayer = z.infer<typeof badgeImageLayerSchema>;

export const badgeLayerSchema = z.discriminatedUnion("type", [
  badgeBackgroundLayerSchema,
  badgeIconLayerSchema,
  badgeTextLayerSchema,
  badgeImageLayerSchema,
]);
export type BadgeLayer = z.infer<typeof badgeLayerSchema>;

const legacyBadgeDesignConfigSchema = z.object({
  shape: badgeShapeSchema,
  primaryColor: z.string(),
  imageUrl: z.string().trim().min(1).max(LAYER_IMAGE_URL_MAX_LENGTH).optional(),
  animation: badgeAnimationSchema.optional(),
});

const studioBadgeDesignConfigSchema = z.object({
  version: z.literal(2),
  animation: badgeAnimationSchema.optional(),
  layers: z.array(badgeLayerSchema).min(1).max(MAX_BADGE_LAYERS),
});

export const badgeDesignConfigSchema = z.union([
  legacyBadgeDesignConfigSchema,
  studioBadgeDesignConfigSchema,
]);
export type BadgeDesignConfig = z.infer<typeof badgeDesignConfigSchema>;

export const sponsorBrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
});
export type SponsorBrand = z.infer<typeof sponsorBrandSchema>;

export const userSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
});
export type UserSearchResult = z.infer<typeof userSearchResultSchema>;

export const badgeAdminSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: badgeCategorySchema,
  rarity: badgeRaritySchema,
  icon: z.string(),
  designConfig: badgeDesignConfigSchema,
  xpReward: z.number(),
  isPermanent: z.boolean(),
  isDynamic: z.boolean(),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  assignmentLimit: z.number().nullable(),
  assignmentCount: z.number(),
  isTitleEligible: z.boolean(),
  sponsorBrand: sponsorBrandSchema.nullable(),
  achievement: z
    .object({
      id: z.string(),
      requirementType: achievementRequirementTypeSchema,
      requirementConfig: z.object({ conditions: z.array(achievementConditionSchema) }),
      isActive: z.boolean(),
      activeFrom: z.string().nullable(),
      activeUntil: z.string().nullable(),
    })
    .nullable(),
});
export type BadgeAdmin = z.infer<typeof badgeAdminSchema>;

export const challengeAdminSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bannerImageUrl: z.string().nullable(),
  isActive: z.boolean(),
  badge: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    category: badgeCategorySchema,
    rarity: badgeRaritySchema,
    xpReward: z.number(),
    designConfig: badgeDesignConfigSchema,
    isPermanent: z.boolean(),
    isPublic: z.boolean(),
    isTitleEligible: z.boolean(),
  }),
  achievement: z.object({
    id: z.string(),
    requirementType: ruleBasedRequirementTypeSchema,
    conditions: z.array(achievementConditionSchema),
    isActive: z.boolean(),
    activeFrom: z.string().nullable(),
    activeUntil: z.string().nullable(),
  }),
});
export type ChallengeAdmin = z.infer<typeof challengeAdminSchema>;

export const creatorLeaderboardCategorySchema = z.enum([
  "TOP_XP",
  "TOP_CREATOR",
  "MOST_LIKES",
  "MOST_ENGAGED",
  "TOP_SELLER",
  "RISING_CREATOR",
  "MOST_ACHIEVEMENTS",
]);
export type CreatorLeaderboardCategoryValue = z.infer<typeof creatorLeaderboardCategorySchema>;

export const creatorLeaderboardCategoryStateSchema = z.object({
  category: creatorLeaderboardCategorySchema,
  enabled: z.boolean(),
});
export type CreatorLeaderboardCategoryState = z.infer<typeof creatorLeaderboardCategoryStateSchema>;

export const creatorCompetitionAdminSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: creatorLeaderboardCategorySchema,
  topN: z.number(),
  isActive: z.boolean(),
  badge: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    icon: z.string(),
    category: badgeCategorySchema,
    rarity: badgeRaritySchema,
    designConfig: badgeDesignConfigSchema,
    xpReward: z.number(),
    isPermanent: z.boolean(),
    isPublic: z.boolean(),
    isTitleEligible: z.boolean(),
  }),
});
export type CreatorCompetitionAdmin = z.infer<typeof creatorCompetitionAdminSchema>;

export const manualAwardSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userHandle: z.string(),
  badgeId: z.string(),
  badgeName: z.string(),
  badgeIcon: z.string(),
  awardReason: z.string().nullable(),
  unlockedAt: z.string(),
});
export type ManualAward = z.infer<typeof manualAwardSchema>;

export const xpStatsSchema = z.object({
  totalXpAwarded: z.number(),
  usersWithProgress: z.number(),
});
export type XpStats = z.infer<typeof xpStatsSchema>;

export const badgeStatsSchema = z.object({
  totalBadgesAwarded: z.number(),
  totalAchievementsUnlocked: z.number(),
  totalManualAwards: z.number(),
  mostAwardedBadge: z
    .object({ badgeId: z.string(), name: z.string(), count: z.number() })
    .nullable(),
});
export type BadgeStats = z.infer<typeof badgeStatsSchema>;

export const awardBadgeResultSchema = z.discriminatedUnion("awarded", [
  z.object({ awarded: z.literal(true), userBadgeId: z.string(), xpReward: z.number() }),
  z.object({ awarded: z.literal(false), reason: z.string() }),
]);
export type AwardBadgeResult = z.infer<typeof awardBadgeResultSchema>;

const levelSnapshotSchema = z.object({ level: z.number(), name: z.string() });

export const adjustXpResultSchema = z.discriminatedUnion("awarded", [
  z.object({
    awarded: z.literal(true),
    amount: z.number(),
    totalXp: z.number(),
    previousLevel: levelSnapshotSchema,
    currentLevel: levelSnapshotSchema,
    leveledUp: z.boolean(),
  }),
  z.object({ awarded: z.literal(false), reason: z.string() }),
]);
export type AdjustXpResult = z.infer<typeof adjustXpResultSchema>;
