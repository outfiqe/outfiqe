import { DomainEvents, eventBus } from "#events/event-bus.js";
import { CreatorLeaderboardCategory, XpActivityType } from "#generated/prisma/enums.js";
import { currentIsoWeekKey } from "#lib/iso-week.utils.js";
import logger from "#lib/winston.utils.js";
import { badgeRepository } from "#modules/badges/badge.repository.js";
import type { BadgeOwnerRecord } from "#modules/badges/badge.types.js";
import { creatorLeaderboardRepository } from "#modules/creator-leaderboard/creatorLeaderboard.repository.js";
import { xpService } from "#modules/xp/xp.service.js";
import { describeError } from "#redis/redis.utils.js";

import {
  ACHIEVEMENT_METRIC,
  ACHIEVEMENT_XP_SOURCE,
  type AchievementMetric,
  RANK_CANDIDATE_OPERATORS,
  RANK_METRIC_CATEGORY,
  TOP_RANK_POSITION_OFFSET,
  UNRANKED_METRIC_VALUE,
} from "./achievement.constants.js";
import { achievementRepository } from "./achievement.repository.js";
import { achievementRequirementConfigSchema } from "./achievement.schemas.js";
import type {
  AchievementProgressView,
  EligibleAchievementRecord,
  MetricSnapshot,
} from "./achievement.types.js";
import {
  areAllConditionsMet,
  collectLeafConditions,
  currentValueForCondition,
} from "./achievement.utils.js";

const rankFetcher =
  (category: CreatorLeaderboardCategory) =>
  async (userId: string): Promise<number> => {
    const rank = await creatorLeaderboardRepository.rankOf(
      category,
      currentIsoWeekKey(new Date()),
      userId,
    );
    return rank === null ? UNRANKED_METRIC_VALUE : rank + TOP_RANK_POSITION_OFFSET;
  };

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
  [ACHIEVEMENT_METRIC.TOP_XP_RANK]: rankFetcher(CreatorLeaderboardCategory.TOP_XP),
  [ACHIEVEMENT_METRIC.TOP_CREATOR_RANK]: rankFetcher(CreatorLeaderboardCategory.TOP_CREATOR),
  [ACHIEVEMENT_METRIC.MOST_LIKES_RANK]: rankFetcher(CreatorLeaderboardCategory.MOST_LIKES),
  [ACHIEVEMENT_METRIC.MOST_ENGAGED_RANK]: rankFetcher(CreatorLeaderboardCategory.MOST_ENGAGED),
  [ACHIEVEMENT_METRIC.TOP_SELLER_RANK]: rankFetcher(CreatorLeaderboardCategory.TOP_SELLER),
  [ACHIEVEMENT_METRIC.RISING_CREATOR_RANK]: rankFetcher(CreatorLeaderboardCategory.RISING_CREATOR),
  [ACHIEVEMENT_METRIC.MOST_ACHIEVEMENTS_RANK]: rankFetcher(
    CreatorLeaderboardCategory.MOST_ACHIEVEMENTS,
  ),
};

const parseAchievementRow = (row: {
  id: string;
  badgeId: string;
  name: string;
  requirementConfig: unknown;
  badge: { name: string; icon: string };
}): EligibleAchievementRecord | null => {
  const parsed = achievementRequirementConfigSchema.safeParse(row.requirementConfig);
  if (!parsed.success) {
    logger.error(`Achievement ${row.id} has an invalid requirementConfig: ${parsed.error.message}`);
    return null;
  }

  return {
    id: row.id,
    badgeId: row.badgeId,
    name: row.name,
    conditions: parsed.data.conditions,
    badgeName: row.badge.name,
    badgeIcon: row.badge.icon,
  };
};

const loadEligibleAchievements = async (userId: string): Promise<EligibleAchievementRecord[]> => {
  const rows = await achievementRepository.findEligibleAchievements(userId);
  return rows
    .map(parseAchievementRow)
    .filter((achievement): achievement is EligibleAchievementRecord => achievement !== null);
};

const loadDynamicAchievements = async (): Promise<EligibleAchievementRecord[]> => {
  const rows = await achievementRepository.findActiveDynamicAchievements();
  return rows
    .map(parseAchievementRow)
    .filter((achievement): achievement is EligibleAchievementRecord => achievement !== null);
};

const buildMetricSnapshot = async (
  userId: string,
  achievements: EligibleAchievementRecord[],
): Promise<MetricSnapshot> => {
  const neededMetrics = new Set<AchievementMetric>();
  for (const achievement of achievements) {
    for (const condition of collectLeafConditions(achievement.conditions)) {
      neededMetrics.add(condition.metric);
    }
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

  await eventBus.publish(DomainEvents.ACHIEVEMENT_UNLOCKED, {
    userId,
    badgeId: achievement.badgeId,
    badgeName: achievement.badgeName,
    badgeIcon: achievement.badgeIcon,
    xpReward: result.xpReward,
  });

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

const MINIMUM_RANK_CANDIDATE_COUNT = 1;

const collectRankCandidateIds = async (
  achievement: EligibleAchievementRecord,
  now: Date,
): Promise<Set<string>> => {
  const week = currentIsoWeekKey(now);
  const rankLeaves = collectLeafConditions(achievement.conditions).filter(
    (condition) =>
      RANK_METRIC_CATEGORY[condition.metric] !== undefined &&
      RANK_CANDIDATE_OPERATORS.includes(condition.operator),
  );

  const memberLists = await Promise.all(
    rankLeaves.map((condition) => {
      const category = RANK_METRIC_CATEGORY[condition.metric];
      if (!category) return Promise.resolve([]);
      const candidateCount = Math.max(MINIMUM_RANK_CANDIDATE_COUNT, Math.ceil(condition.value));
      return creatorLeaderboardRepository.topN(category, week, candidateCount);
    }),
  );

  return new Set(memberLists.flat().map((entry) => entry.member));
};

const applyDynamicRecheckResult = async (
  userId: string,
  achievement: EligibleAchievementRecord,
  owner: BadgeOwnerRecord | undefined,
  qualifies: boolean,
): Promise<void> => {
  if (!owner) {
    if (qualifies) await unlockAchievement(userId, achievement);
    return;
  }

  if (qualifies && !owner.isDynamicallyEligible) {
    await badgeRepository.setDynamicEligibility(userId, achievement.badgeId, true);
  } else if (!qualifies && owner.isDynamicallyEligible) {
    await badgeRepository.setDynamicEligibility(userId, achievement.badgeId, false);
  }
};

const recheckOneDynamicAchievement = async (
  achievement: EligibleAchievementRecord,
  now: Date,
): Promise<void> => {
  const [owners, rankCandidateIds] = await Promise.all([
    badgeRepository.listOwnersOfBadge(achievement.badgeId),
    collectRankCandidateIds(achievement, now),
  ]);
  const ownerByUserId = new Map(owners.map((owner) => [owner.userId, owner]));
  const candidateIds = new Set([...ownerByUserId.keys(), ...rankCandidateIds]);

  for (const userId of candidateIds) {
    const snapshot = await buildMetricSnapshot(userId, [achievement]);
    const qualifies = areAllConditionsMet(achievement.conditions, snapshot);
    await applyDynamicRecheckResult(userId, achievement, ownerByUserId.get(userId), qualifies);
  }
};

const recheckDynamicBadges = async (): Promise<void> => {
  try {
    const now = new Date();
    const dynamicAchievements = await loadDynamicAchievements();
    for (const achievement of dynamicAchievements) {
      await recheckOneDynamicAchievement(achievement, now);
    }
  } catch (error) {
    logger.error(`Dynamic badge recheck failed: ${describeError(error)}`);
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
    conditions: collectLeafConditions(achievement.conditions).map((condition) => ({
      ...condition,
      currentValue: currentValueForCondition(condition, snapshot),
    })),
  }));
};

export const achievementService = { evaluateForUser, listProgressForUser, recheckDynamicBadges };
