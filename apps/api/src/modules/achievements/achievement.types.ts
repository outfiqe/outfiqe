import type { AchievementMetric } from "./achievement.constants.js";
import type { AchievementCondition } from "./achievement.schemas.js";

export type EligibleAchievementRecord = {
  id: string;
  badgeId: string;
  name: string;
  conditions: AchievementCondition[];
  badgeName: string;
  badgeIcon: string;
  xpReward: number;
};

export type MetricSnapshot = Partial<Record<AchievementMetric, number>>;

export type AchievementConditionProgress = AchievementCondition & { currentValue: number };

export type AchievementProgressView = {
  achievementId: string;
  badgeId: string;
  badgeName: string;
  badgeIcon: string;
  conditions: AchievementConditionProgress[];
};
