import type { AchievementMetricValue, ConditionOperatorValue } from "../schemas";
import type { ConditionFormState } from "./condition.types";

export const METRIC_OPTIONS: AchievementMetricValue[] = [
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
];

export const OPERATOR_OPTIONS: ConditionOperatorValue[] = ["gte", "gt", "eq", "lte", "lt"];

export const EMPTY_CONDITION: ConditionFormState = {
  metric: "total_likes",
  operator: "gte",
  value: "",
};
