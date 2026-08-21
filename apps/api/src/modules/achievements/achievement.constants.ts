export const ACHIEVEMENT_METRIC = {
  LEVEL: "level",
  POSTS_CREATED: "posts_created",
  PURCHASES_COUNT: "purchases_count",
  TOTAL_LIKES: "total_likes",
  COMMENTS_MADE: "comments_made",
  SALES_COUNT: "sales_count",
  TOTAL_VIEWS: "total_views",
} as const;

export type AchievementMetric = (typeof ACHIEVEMENT_METRIC)[keyof typeof ACHIEVEMENT_METRIC];

export const CONDITION_OPERATOR = {
  GTE: "gte",
  GT: "gt",
  EQ: "eq",
  LTE: "lte",
  LT: "lt",
} as const;

export type ConditionOperator = (typeof CONDITION_OPERATOR)[keyof typeof CONDITION_OPERATOR];

export const CONDITION_NODE_TYPE = {
  AND: "AND",
  OR: "OR",
  NOT: "NOT",
} as const;

export type ConditionNodeType = (typeof CONDITION_NODE_TYPE)[keyof typeof CONDITION_NODE_TYPE];

export const ACHIEVEMENT_XP_SOURCE = "achievements";
