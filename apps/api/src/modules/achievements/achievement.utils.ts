import { CONDITION_OPERATOR, type ConditionOperator } from "./achievement.constants.js";
import type { AchievementCondition } from "./achievement.schemas.js";
import type { MetricSnapshot } from "./achievement.types.js";

const DEFAULT_METRIC_VALUE = 0;

const COMPARATORS: Record<ConditionOperator, (currentValue: number, target: number) => boolean> = {
  [CONDITION_OPERATOR.GTE]: (currentValue, target) => currentValue >= target,
  [CONDITION_OPERATOR.GT]: (currentValue, target) => currentValue > target,
  [CONDITION_OPERATOR.EQ]: (currentValue, target) => currentValue === target,
  [CONDITION_OPERATOR.LTE]: (currentValue, target) => currentValue <= target,
  [CONDITION_OPERATOR.LT]: (currentValue, target) => currentValue < target,
};

export const currentValueForCondition = (
  condition: AchievementCondition,
  snapshot: MetricSnapshot,
): number => snapshot[condition.metric] ?? DEFAULT_METRIC_VALUE;

export const isConditionMet = (
  condition: AchievementCondition,
  snapshot: MetricSnapshot,
): boolean =>
  COMPARATORS[condition.operator](currentValueForCondition(condition, snapshot), condition.value);

export const areAllConditionsMet = (
  conditions: AchievementCondition[],
  snapshot: MetricSnapshot,
): boolean => conditions.every((condition) => isConditionMet(condition, snapshot));
