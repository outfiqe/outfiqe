import { z } from "zod";

import {
  ACHIEVEMENT_METRIC,
  CONDITION_NODE_TYPE,
  CONDITION_OPERATOR,
} from "./achievement.constants.js";

const MIN_OR_BRANCHES = 2;

export const achievementConditionSchema = z.object({
  metric: z.enum(ACHIEVEMENT_METRIC),
  operator: z.enum(CONDITION_OPERATOR),
  value: z.number(),
});

export type AchievementCondition = z.infer<typeof achievementConditionSchema>;

export type AchievementConditionNode =
  | AchievementCondition
  | { type: typeof CONDITION_NODE_TYPE.AND; conditions: AchievementConditionNode[] }
  | { type: typeof CONDITION_NODE_TYPE.OR; conditions: AchievementConditionNode[] }
  | { type: typeof CONDITION_NODE_TYPE.NOT; condition: AchievementConditionNode };

export const achievementConditionNodeSchema: z.ZodType<AchievementConditionNode> = z.lazy(() =>
  z.union([
    achievementConditionSchema,
    z.object({
      type: z.literal(CONDITION_NODE_TYPE.AND),
      conditions: z.array(achievementConditionNodeSchema).min(1),
    }),
    z.object({
      type: z.literal(CONDITION_NODE_TYPE.OR),
      conditions: z.array(achievementConditionNodeSchema).min(MIN_OR_BRANCHES),
    }),
    z.object({
      type: z.literal(CONDITION_NODE_TYPE.NOT),
      condition: achievementConditionNodeSchema,
    }),
  ]),
);

export const achievementRequirementConfigSchema = z.object({
  conditions: z.array(achievementConditionNodeSchema).min(1),
});

export type AchievementRequirementConfig = z.infer<typeof achievementRequirementConfigSchema>;
