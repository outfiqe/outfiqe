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
];

export const OPERATOR_OPTIONS: ConditionOperatorValue[] = ["gte", "gt", "eq", "lte", "lt"];

export const EMPTY_CONDITION: ConditionFormState = {
  metric: "total_likes",
  operator: "gte",
  value: "",
};
