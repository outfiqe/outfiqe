import { XpActivityType } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { badgeRepository } from "#modules/badges/badge.repository.js";
import { xpService } from "#modules/xp/xp.service.js";
import { describeError } from "#redis/redis.utils.js";

import {
  ACHIEVEMENT_METRIC,
  ACHIEVEMENT_XP_SOURCE,
  type AchievementMetric,
} from "./achievement.constants.js";
import { achievementRepository } from "./achievement.repository.js";
import { achievementRequirementConfigSchema } from "./achievement.schemas.js";
import type {
  AchievementProgressView,
  EligibleAchievementRecord,
  MetricSnapshot,
} from "./achievement.types.js";
import { areAllConditionsMet, currentValueForCondition } from "./achievement.utils.js";

const metricFetchers: Record<AchievementMetric, (userId: string) => Promise<number>> = {
  [ACHIEVEMENT_METRIC.LEVEL]: async (userId) => {
    const progress = await xpService.getProgressForUser(userId);
    return progress?.level.level ?? 1;
  },
  [ACHIEVEMENT_METRIC.POSTS_CREATED]: (userId) => achievementRepository.countActiveLooks(userId),
  [ACHIEVEMENT_METRIC.PURCHASES_COUNT]: (userId) => achievementRepository.countPurchases(userId),
  [ACHIEVEMENT_METRIC.TOTAL_LIKES]: (userId) => achievementRepository.sumLikesReceived(userId),
  [ACHIEVEMENT_METRIC.COMMENTS_MADE]: (userId) => achievementRepository.countCommentsMade(userId),
  [ACHIEVEMENT_METRIC.SALES_COUNT]: (userId) => achievementRepository.countSalesGenerated(userId),
  [ACHIEVEMENT_METRIC.TOTAL_VIEWS]: (userId) => achievementRepository.sumViewsReceived(userId),
};

const loadEligibleAchievements = async (userId: string): Promise<EligibleAchievementRecord[]> => {
  const rows = await achievementRepository.findEligibleAchievements(userId);

  const eligible: EligibleAchievementRecord[] = [];
  for (const row of rows) {
    const parsed = achievementRequirementConfigSchema.safeParse(row.requirementConfig);
    if (!parsed.success) {
      logger.error(
        `Achievement ${row.id} has an invalid requirementConfig: ${parsed.error.message}`,
      );
      continue;
    }

    eligible.push({
      id: row.id,
      badgeId: row.badgeId,
      name: row.name,
      conditions: parsed.data.conditions,
      badgeName: row.badge.name,
      badgeIcon: row.badge.icon,
    });
  }
  return eligible;
};

const buildMetricSnapshot = async (
  userId: string,
  achievements: EligibleAchievementRecord[],
): Promise<MetricSnapshot> => {
  const neededMetrics = new Set<AchievementMetric>();
  for (const achievement of achievements) {
    for (const condition of achievement.conditions) neededMetrics.add(condition.metric);
  }

  const entries = await Promise.all(
    [...neededMetrics].map(async (metric): Promise<[AchievementMetric, number]> => [
      metric,
      await metricFetchers[metric](userId),
    ]),
  );
  return Object.fromEntries(entries);
};

const unlockAchievement = async (
  userId: string,
  achievement: EligibleAchievementRecord,
): Promise<void> => {
  const result = await badgeRepository.awardBadge({ userId, badgeId: achievement.badgeId });
  if (!result.awarded) {
    logger.warn(
      `Achievement ${achievement.id} qualified for user ${userId} but the badge award was skipped: ${result.reason}`,
    );
    return;
  }

  if (result.xpReward > 0) {
    await xpService.grantFixedXp(
      {
        userId,
        activityType: XpActivityType.ACHIEVEMENT_UNLOCKED,
        relatedEntityId: achievement.badgeId,
        source: ACHIEVEMENT_XP_SOURCE,
        metadata: { achievementId: achievement.id },
      },
      result.xpReward,
    );
  }
};

const evaluateForUser = async (userId: string): Promise<EligibleAchievementRecord[]> => {
  try {
    const eligible = await loadEligibleAchievements(userId);
    if (eligible.length === 0) return [];

    const snapshot = await buildMetricSnapshot(userId, eligible);
    const unlocked = eligible.filter((achievement) =>
      areAllConditionsMet(achievement.conditions, snapshot),
    );

    for (const achievement of unlocked) {
      await unlockAchievement(userId, achievement);
    }

    return unlocked;
  } catch (error) {
    logger.error(`Achievement evaluation failed for user ${userId}: ${describeError(error)}`);
    return [];
  }
};

const listProgressForUser = async (userId: string): Promise<AchievementProgressView[]> => {
  const eligible = await loadEligibleAchievements(userId);
  if (eligible.length === 0) return [];

  const snapshot = await buildMetricSnapshot(userId, eligible);

  return eligible.map((achievement) => ({
    achievementId: achievement.id,
    badgeId: achievement.badgeId,
    badgeName: achievement.badgeName,
    badgeIcon: achievement.badgeIcon,
    conditions: achievement.conditions.map((condition) => ({
      ...condition,
      currentValue: currentValueForCondition(condition, snapshot),
    })),
  }));
};

export const achievementService = { evaluateForUser, listProgressForUser };
