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

export const activityXpConfigSchema = z.object({
  activityType: z.string(),
  enabled: z.boolean(),
  xpAmount: z.number(),
  dailyLimit: z.number().nullable(),
  cooldownSeconds: z.number().nullable(),
  maxPerEntity: z.number().nullable(),
});
export type ActivityXpConfig = z.infer<typeof activityXpConfigSchema>;

export const badgeDesignConfigSchema = z.object({
  shape: badgeShapeSchema,
  primaryColor: z.string(),
  animation: badgeAnimationSchema.optional(),
});

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
