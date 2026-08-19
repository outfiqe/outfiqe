import { z } from "zod";

import { ACHIEVEMENT_METRIC, CONDITION_OPERATOR } from "./achievement.constants.js";

export const achievementConditionSchema = z.object({
  metric: z.enum(ACHIEVEMENT_METRIC),
  operator: z.enum(CONDITION_OPERATOR),
  value: z.number(),
});

export const achievementRequirementConfigSchema = z.object({
  conditions: z.array(achievementConditionSchema).min(1),
});

export type AchievementCondition = z.infer<typeof achievementConditionSchema>;
export type AchievementRequirementConfig = z.infer<typeof achievementRequirementConfigSchema>;
