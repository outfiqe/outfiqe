import type { AchievementMetricValue, ConditionOperatorValue } from "../../api/gamificationSchemas";

export type ConditionFormState = {
  metric: AchievementMetricValue;
  operator: ConditionOperatorValue;
  value: string;
};
