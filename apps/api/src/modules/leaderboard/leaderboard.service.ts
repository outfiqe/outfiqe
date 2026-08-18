import {
  LEADERBOARD_CATEGORY,
  type LeaderboardCategory,
} from "#constants/leaderboard.constants.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { trendingService } from "#modules/trending/trending.service.js";
import { describeError } from "#redis/redis.utils.js";

import { FASTEST_GROWING_SURGE_SCORE, LEADERBOARD_TOP_N } from "./leaderboard.constants.js";
import { leaderboardRepository } from "./leaderboard.repository.js";
import type { LeaderboardEntry, LeaderboardSnapshot } from "./leaderboard.types.js";
import {
  currentIsoWeekKey,
  currentIsoWeekStart,
  formatScoreLabel,
  previousIsoWeekKey,
} from "./leaderboard.utils.js";

const GROWTH_PERCENT_MULTIPLIER = 100;

const publishUpdated = async (category: LeaderboardCategory, week: string): Promise<void> => {
  await eventBus.publish(DomainEvents.LEADERBOARD_BRAND_UPDATED, { category, week });
};

const recomputeMostPurchased = async (now: Date): Promise<void> => {
  const week = currentIsoWeekKey(now);
  const totals = await leaderboardRepository.sumPurchaseUnitsByBrand(currentIsoWeekStart(now));

  await leaderboardRepository.replaceWeeklyScores(
    LEADERBOARD_CATEGORY.MOST_PURCHASED,
    week,
    totals.map(({ brandId, totalUnits }) => ({ member: brandId, score: totalUnits })),
  );
  await publishUpdated(LEADERBOARD_CATEGORY.MOST_PURCHASED, week);
};

const recomputeTrending = async (now: Date): Promise<void> => {
  const week = currentIsoWeekKey(now);
  const scoresByBrand = await trendingService.getBrandTrendScores();

  await leaderboardRepository.replaceWeeklyScores(
    LEADERBOARD_CATEGORY.TRENDING,
    week,
    [...scoresByBrand.entries()].map(([brandId, score]) => ({ member: brandId, score })),
  );
  await publishUpdated(LEADERBOARD_CATEGORY.TRENDING, week);
};

const recomputeFastestGrowing = async (now: Date): Promise<void> => {
  const week = currentIsoWeekKey(now);
  const previousWeek = previousIsoWeekKey(now);

  const [currentScores, previousScores] = await Promise.all([
    leaderboardRepository.allScores(LEADERBOARD_CATEGORY.MOST_PURCHASED, week),
    leaderboardRepository.allScores(LEADERBOARD_CATEGORY.MOST_PURCHASED, previousWeek),
  ]);
  const previousByBrand = new Map(previousScores.map(({ member, score }) => [member, score]));

  const growthEntries = currentScores
    .filter(({ score }) => score > 0)
    .map(({ member, score }) => {
      const previousScore = previousByBrand.get(member) ?? 0;
      const growth =
        previousScore > 0
          ? ((score - previousScore) / previousScore) * GROWTH_PERCENT_MULTIPLIER
          : FASTEST_GROWING_SURGE_SCORE;
      return { member, score: growth };
    });

  await leaderboardRepository.replaceWeeklyScores(
    LEADERBOARD_CATEGORY.FASTEST_GROWING,
    week,
    growthEntries,
  );
  await publishUpdated(LEADERBOARD_CATEGORY.FASTEST_GROWING, week);
};

const recordBrandFollowDelta = async (brandId: string, delta: 1 | -1): Promise<void> => {
  const week = currentIsoWeekKey(new Date());
  try {
    await leaderboardRepository.incrementScore(
      LEADERBOARD_CATEGORY.MOST_LOVED,
      week,
      brandId,
      delta,
    );
    await publishUpdated(LEADERBOARD_CATEGORY.MOST_LOVED, week);
  } catch (error) {
    logger.error(
      `Failed to update most-loved leaderboard for brand ${brandId}: ${describeError(error)}`,
    );
  }
};

const getTop = async (category: LeaderboardCategory): Promise<LeaderboardSnapshot> => {
  const now = new Date();
  const week = currentIsoWeekKey(now);
  const previousWeek = previousIsoWeekKey(now);

  const top = await leaderboardRepository.topN(category, week, LEADERBOARD_TOP_N);
  const [brands, previousRanks] = await Promise.all([
    brandRepository.findManyByIds(top.map(({ member }) => member)),
    Promise.all(
      top.map(({ member }) => leaderboardRepository.rankOf(category, previousWeek, member)),
    ),
  ]);
  const brandsById = new Map(brands.map((brand) => [brand.id, brand]));

  const entries: LeaderboardEntry[] = [];
  top.forEach(({ member, score }, index) => {
    const brand = brandsById.get(member);
    if (!brand) return;

    const previousRank = previousRanks[index] ?? null;
    entries.push({
      rank: index + 1,
      brandId: brand.id,
      brandName: brand.name,
      avatarUrl: brand.avatarUrl,
      score,
      scoreLabel: formatScoreLabel(category, score),
      movement: previousRank === null ? null : previousRank - index,
    });
  });

  return { category, week, entries };
};

export const leaderboardService = {
  async runMostPurchasedRecompute(): Promise<void> {
    await recomputeMostPurchased(new Date());
  },
  async runTrendingRecompute(): Promise<void> {
    await recomputeTrending(new Date());
  },
  async runFastestGrowingRecompute(): Promise<void> {
    await recomputeFastestGrowing(new Date());
  },
  recordBrandFollowDelta,
  getTop,
};
