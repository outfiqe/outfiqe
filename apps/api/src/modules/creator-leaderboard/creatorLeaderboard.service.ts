import { DomainEvents, eventBus } from "#events/event-bus.js";
import { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";
import { currentIsoWeekKey, previousIsoWeekKey } from "#lib/iso-week.utils.js";
import logger from "#lib/winston.utils.js";
import { userRepository } from "#modules/users/user.repository.js";
import { describeError } from "#redis/redis.utils.js";

import { CREATOR_LEADERBOARD_TOP_N } from "./creatorLeaderboard.constants.js";
import { creatorLeaderboardRepository } from "./creatorLeaderboard.repository.js";
import type {
  CreatorLeaderboardCategoryState,
  CreatorLeaderboardEntry,
  CreatorLeaderboardSnapshot,
  CreatorStatsRow,
} from "./creatorLeaderboard.types.js";
import {
  deriveGrowthScore,
  formatCreatorScoreLabel,
  scoreForCategory,
} from "./creatorLeaderboard.utils.js";

const STATS_DERIVED_CATEGORIES: CreatorLeaderboardCategory[] = [
  CreatorLeaderboardCategory.TOP_XP,
  CreatorLeaderboardCategory.TOP_CREATOR,
  CreatorLeaderboardCategory.MOST_LIKES,
  CreatorLeaderboardCategory.MOST_ENGAGED,
  CreatorLeaderboardCategory.TOP_SELLER,
  CreatorLeaderboardCategory.MOST_ACHIEVEMENTS,
];

const publishUpdated = async (
  category: CreatorLeaderboardCategory,
  week: string,
): Promise<void> => {
  await eventBus.publish(DomainEvents.LEADERBOARD_CREATOR_UPDATED, { category, week });
};

const writeStatsDerivedCategories = async (
  week: string,
  stats: CreatorStatsRow[],
): Promise<void> => {
  await Promise.all(
    STATS_DERIVED_CATEGORIES.map(async (category) => {
      const entries = stats.map((row) => ({
        member: row.creatorId,
        score: scoreForCategory(category, row),
      }));
      await creatorLeaderboardRepository.replaceWeeklyScores(category, week, entries);
      await publishUpdated(category, week);
    }),
  );
};

const writeRisingCreator = async (now: Date): Promise<void> => {
  const week = currentIsoWeekKey(now);
  const previousWeek = previousIsoWeekKey(now);

  const [currentXpScores, previousXpScores] = await Promise.all([
    creatorLeaderboardRepository.allScores(CreatorLeaderboardCategory.TOP_XP, week),
    creatorLeaderboardRepository.allScores(CreatorLeaderboardCategory.TOP_XP, previousWeek),
  ]);
  const previousXpByCreator = new Map(previousXpScores.map(({ member, score }) => [member, score]));

  const growthEntries = currentXpScores
    .filter(({ score }) => score > 0)
    .map(({ member, score }) => ({
      member,
      score: deriveGrowthScore(score, previousXpByCreator.get(member) ?? 0),
    }));

  await creatorLeaderboardRepository.replaceWeeklyScores(
    CreatorLeaderboardCategory.RISING_CREATOR,
    week,
    growthEntries,
  );
  await publishUpdated(CreatorLeaderboardCategory.RISING_CREATOR, week);
};

const recomputeAll = async (now: Date): Promise<void> => {
  const week = currentIsoWeekKey(now);
  const stats = await creatorLeaderboardRepository.fetchCreatorStats();

  await writeStatsDerivedCategories(week, stats);
  await writeRisingCreator(now);
};

const getTop = async (
  category: CreatorLeaderboardCategory,
): Promise<CreatorLeaderboardSnapshot> => {
  const now = new Date();
  const week = currentIsoWeekKey(now);
  const previousWeek = previousIsoWeekKey(now);
  const isEnabled = await creatorLeaderboardRepository.isCategoryEnabled(category);
  if (!isEnabled) return { category, week, isEnabled: false, entries: [] };

  const currentTop = await creatorLeaderboardRepository.topN(
    category,
    week,
    CREATOR_LEADERBOARD_TOP_N,
  );
  const isAwaitingFirstRecompute = currentTop.length === 0;
  const top = isAwaitingFirstRecompute
    ? await creatorLeaderboardRepository.topN(category, previousWeek, CREATOR_LEADERBOARD_TOP_N)
    : currentTop;

  const [creators, previousRanks] = await Promise.all([
    userRepository.findManyByIds(top.map(({ member }) => member)),
    isAwaitingFirstRecompute
      ? Promise.resolve(top.map(() => null))
      : Promise.all(
          top.map(({ member }) =>
            creatorLeaderboardRepository.rankOf(category, previousWeek, member),
          ),
        ),
  ]);
  const creatorsById = new Map(creators.map((creator) => [creator.id, creator]));

  const entries: CreatorLeaderboardEntry[] = [];
  top.forEach(({ member, score }, index) => {
    const creator = creatorsById.get(member);
    if (!creator) return;

    const previousRank = previousRanks[index] ?? null;
    entries.push({
      rank: index + 1,
      creatorId: creator.id,
      creatorName: creator.name,
      creatorHandle: creator.handle,
      avatarUrl: creator.avatarUrl,
      score,
      scoreLabel: formatCreatorScoreLabel(category, score),
      movement: previousRank === null ? null : previousRank - index,
    });
  });

  return { category, week, isEnabled, entries };
};

const listCategoryStates = async (): Promise<CreatorLeaderboardCategoryState[]> => {
  const configured = await creatorLeaderboardRepository.listCategoryConfigs();
  const configuredByCategory = new Map(configured.map((row) => [row.category, row.enabled]));

  return Object.values(CreatorLeaderboardCategory).map((category) => ({
    category,
    enabled: configuredByCategory.get(category) ?? true,
  }));
};

const setCategoryEnabled = (
  category: CreatorLeaderboardCategory,
  enabled: boolean,
): Promise<CreatorLeaderboardCategoryState> =>
  creatorLeaderboardRepository.setCategoryEnabled(category, enabled);

export const creatorLeaderboardService = {
  async runRecompute(): Promise<void> {
    try {
      await recomputeAll(new Date());
    } catch (error) {
      logger.error(`Creator leaderboard recompute failed: ${describeError(error)}`);
    }
  },
  getTop,
  listCategoryStates,
  setCategoryEnabled,
};
