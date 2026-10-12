import { truncateToHour } from "#lib/trend-scoring.utils.js";
import logger from "#lib/winston.utils.js";

import {
  TAG_TREND_METRIC_RETENTION_DAYS,
  TREND_METRIC_RETENTION_DAYS,
} from "../creator-look.constants.js";
import type {
  CreatorMomentumEntry,
  PostTrendingEntry,
  TagScoreBreakdown,
  TrendingTag,
} from "../creator-look.types.js";
import { creatorLookHashtagTrendingRepository } from "./hashtag-trending.repository.js";
import { creatorLookPostTrendingRepository } from "./post-trending.repository.js";

export const creatorLookTrendingService = {
  async trendingTags(): Promise<TrendingTag[]> {
    return creatorLookHashtagTrendingRepository.trendingTags();
  },

  async runTrendingAggregation(): Promise<{ bucketStart: Date; deletedBuckets: number }> {
    const bucketStart = truncateToHour(new Date());
    await creatorLookPostTrendingRepository.upsertHourlyPostMetrics(bucketStart);

    const retentionCutoff = new Date(
      Date.now() - TREND_METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const deletedBuckets =
      await creatorLookPostTrendingRepository.deleteTrendMetricsOlderThan(retentionCutoff);

    return { bucketStart, deletedBuckets };
  },

  async runTrendingScoring(): Promise<{ ranked: PostTrendingEntry[] }> {
    const { postScores, creatorMomentum } =
      await creatorLookPostTrendingRepository.computeRankedTrendingScoreAndCreatorMomentum();
    if (postScores.length === 0) {
      logger.warn("explore-trending-scoring produced zero scored drops this cycle");
    }
    await Promise.all([
      creatorLookPostTrendingRepository.cacheRankedTrendingScore(postScores),
      creatorLookPostTrendingRepository.cacheRankedCreatorMomentumScores(creatorMomentum),
    ]);
    return { ranked: postScores };
  },

  async runCreatorMomentumScoring(): Promise<{ ranked: CreatorMomentumEntry[] }> {
    const ranked = await creatorLookPostTrendingRepository.computeRankedCreatorMomentumScores();
    await creatorLookPostTrendingRepository.cacheRankedCreatorMomentumScores(ranked);
    return { ranked };
  },

  async runTagTrendingAggregation(): Promise<{ bucketStart: Date; deletedBuckets: number }> {
    const bucketStart = truncateToHour(new Date());
    await creatorLookHashtagTrendingRepository.upsertHourlyTagMetrics(bucketStart);

    const retentionCutoff = new Date(
      Date.now() - TAG_TREND_METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const deletedBuckets =
      await creatorLookHashtagTrendingRepository.deleteTagTrendMetricsOlderThan(retentionCutoff);

    return { bucketStart, deletedBuckets };
  },

  async runTagTrendingScoring(): Promise<{ ranked: TagScoreBreakdown[] }> {
    const ranked = await creatorLookHashtagTrendingRepository.computeRankedTrendingTags();
    if (ranked.length === 0) {
      logger.warn("tag-trend-scoring produced zero scored tags this cycle");
    }
    await creatorLookHashtagTrendingRepository.cacheRankedTrendingTags(ranked);
    return { ranked };
  },
};
