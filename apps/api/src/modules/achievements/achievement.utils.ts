import {
  CONDITION_NODE_TYPE,
  CONDITION_OPERATOR,
  type ConditionOperator,
} from "./achievement.constants.js";
import type { AchievementCondition, AchievementConditionNode } from "./achievement.schemas.js";
import type { MetricSnapshot } from "./achievement.types.js";

const DEFAULT_METRIC_VALUE = 0;

const COMPARATORS: Record<ConditionOperator, (currentValue: number, target: number) => boolean> = {
  [CONDITION_OPERATOR.GTE]: (currentValue, target) => currentValue >= target,
  [CONDITION_OPERATOR.GT]: (currentValue, target) => currentValue > target,
  [CONDITION_OPERATOR.EQ]: (currentValue, target) => currentValue === target,
  [CONDITION_OPERATOR.LTE]: (currentValue, target) => currentValue <= target,
  [CONDITION_OPERATOR.LT]: (currentValue, target) => currentValue < target,
};

export const isConditionLeaf = (node: AchievementConditionNode): node is AchievementCondition =>
  !("type" in node);

export const currentValueForCondition = (
  condition: AchievementCondition,
  snapshot: MetricSnapshot,
): number => snapshot[condition.metric] ?? DEFAULT_METRIC_VALUE;

export const isConditionMet = (
  condition: AchievementCondition,
  snapshot: MetricSnapshot,
): boolean =>
  COMPARATORS[condition.operator](currentValueForCondition(condition, snapshot), condition.value);

export const evaluateConditionNode = (
  node: AchievementConditionNode,
  snapshot: MetricSnapshot,
): boolean => {
  if (isConditionLeaf(node)) return isConditionMet(node, snapshot);

  switch (node.type) {
    case CONDITION_NODE_TYPE.AND:
      return node.conditions.every((child) => evaluateConditionNode(child, snapshot));
    case CONDITION_NODE_TYPE.OR:
      return node.conditions.some((child) => evaluateConditionNode(child, snapshot));
    case CONDITION_NODE_TYPE.NOT:
      return !evaluateConditionNode(node.condition, snapshot);
  }
};

export const areAllConditionsMet = (
  conditions: AchievementConditionNode[],
  snapshot: MetricSnapshot,
): boolean => conditions.every((node) => evaluateConditionNode(node, snapshot));

export const collectLeafConditions = (
  conditions: AchievementConditionNode[],
): AchievementCondition[] =>
  conditions.flatMap((node) => {
    if (isConditionLeaf(node)) return [node];
    if (node.type === CONDITION_NODE_TYPE.NOT) return collectLeafConditions([node.condition]);
    return collectLeafConditions(node.conditions);
  });
