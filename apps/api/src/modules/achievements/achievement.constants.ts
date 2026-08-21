import { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";

export const ACHIEVEMENT_METRIC = {
  LEVEL: "level",
  POSTS_CREATED: "posts_created",
  PURCHASES_COUNT: "purchases_count",
  TOTAL_LIKES: "total_likes",
  COMMENTS_MADE: "comments_made",
  SALES_COUNT: "sales_count",
  TOTAL_VIEWS: "total_views",
  TOP_XP_RANK: "top_xp_rank",
  TOP_CREATOR_RANK: "top_creator_rank",
  MOST_LIKES_RANK: "most_likes_rank",
  MOST_ENGAGED_RANK: "most_engaged_rank",
  TOP_SELLER_RANK: "top_seller_rank",
  RISING_CREATOR_RANK: "rising_creator_rank",
  MOST_ACHIEVEMENTS_RANK: "most_achievements_rank",
} as const;

export type AchievementMetric = (typeof ACHIEVEMENT_METRIC)[keyof typeof ACHIEVEMENT_METRIC];

export const RANK_METRIC_CATEGORY: Partial<Record<AchievementMetric, CreatorLeaderboardCategory>> =
  {
    [ACHIEVEMENT_METRIC.TOP_XP_RANK]: CreatorLeaderboardCategory.TOP_XP,
    [ACHIEVEMENT_METRIC.TOP_CREATOR_RANK]: CreatorLeaderboardCategory.TOP_CREATOR,
    [ACHIEVEMENT_METRIC.MOST_LIKES_RANK]: CreatorLeaderboardCategory.MOST_LIKES,
    [ACHIEVEMENT_METRIC.MOST_ENGAGED_RANK]: CreatorLeaderboardCategory.MOST_ENGAGED,
    [ACHIEVEMENT_METRIC.TOP_SELLER_RANK]: CreatorLeaderboardCategory.TOP_SELLER,
    [ACHIEVEMENT_METRIC.RISING_CREATOR_RANK]: CreatorLeaderboardCategory.RISING_CREATOR,
    [ACHIEVEMENT_METRIC.MOST_ACHIEVEMENTS_RANK]: CreatorLeaderboardCategory.MOST_ACHIEVEMENTS,
  };

export const UNRANKED_METRIC_VALUE = Number.MAX_SAFE_INTEGER;
export const TOP_RANK_POSITION_OFFSET = 1;

export const DYNAMIC_BADGE_RECHECK_INTERVAL_MS = 15 * 60 * 1000;

export const CONDITION_OPERATOR = {
  GTE: "gte",
  GT: "gt",
  EQ: "eq",
  LTE: "lte",
  LT: "lt",
} as const;

export type ConditionOperator = (typeof CONDITION_OPERATOR)[keyof typeof CONDITION_OPERATOR];

export const RANK_CANDIDATE_OPERATORS: ConditionOperator[] = [
  CONDITION_OPERATOR.LTE,
  CONDITION_OPERATOR.LT,
];

export const CONDITION_NODE_TYPE = {
  AND: "AND",
  OR: "OR",
  NOT: "NOT",
} as const;

export type ConditionNodeType = (typeof CONDITION_NODE_TYPE)[keyof typeof CONDITION_NODE_TYPE];

export const ACHIEVEMENT_XP_SOURCE = "achievements";
