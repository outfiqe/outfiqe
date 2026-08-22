import type { AchievementMetric } from "./achievement.constants.js";
import type { AchievementCondition, AchievementConditionNode } from "./achievement.schemas.js";

export type EligibleAchievementRecord = {
  id: string;
  badgeId: string;
  name: string;
  conditions: AchievementConditionNode[];
  badgeName: string;
  badgeIcon: string;
  sponsorBrandName: string | null;
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
