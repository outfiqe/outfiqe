import type { AchievementMetricValue, ConditionOperatorValue } from "../schemas";

export type ConditionFormState = {
  metric: AchievementMetricValue;
  operator: ConditionOperatorValue;
  value: string;
};
