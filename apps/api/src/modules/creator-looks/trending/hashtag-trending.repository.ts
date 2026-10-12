import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { ageHoursOf } from "#lib/trend-scoring.utils.js";
import logger from "#lib/winston.utils.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import {
  HOUR_MS,
  TAG_TREND_BASELINE_WINDOW_DAYS,
  TAG_TREND_RECENT_METRICS_WINDOW_HOURS,
  TAG_TREND_SCORE_RECOMPUTE_LOCK_TTL_MS,
  TAG_TRENDING_LIMIT,
} from "../creator-look.constants.js";
import type { TagMetricBucket, TagScoreBreakdown, TrendingTag } from "../creator-look.types.js";
import {
  computeGlobalTagBaseline,
  groupTagBucketsByTag,
  scoreTag,
} from "./hashtag-scoring.utils.js";

const TRENDING_TAGS_LIMIT = 15;
const TRENDING_TAGS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const TRENDING_TAGS_CACHE_KEY = redisKeys.cache("creator-looks", "trending-tags");

const fetchLegacyTrendingTags = async (): Promise<TrendingTag[]> => {
  try {
    const cached = await cacheService.get<TrendingTag[]>(TRENDING_TAGS_CACHE_KEY);
    if (cached) return cached;
  } catch (error) {
    logger.warn(`Cache read failed for "${TRENDING_TAGS_CACHE_KEY}": ${describeError(error)}`);
  }

  const since = new Date(Date.now() - TRENDING_TAGS_WINDOW_MS);
  const rows = await prisma.$queryRaw<{ tag: string; post_count: bigint }[]>(Prisma.sql`
    SELECT h.tag, COUNT(*)::bigint AS post_count
    FROM creator_look_hashtags h
    JOIN creator_looks cl ON cl.id = h.creator_look_id
    WHERE cl.deleted_at IS NULL AND cl.created_at >= ${since}
    GROUP BY h.tag
    ORDER BY post_count DESC
    LIMIT ${TRENDING_TAGS_LIMIT}
  `);

  const trendingTags = rows.map((row) => ({ tag: row.tag, postCount: Number(row.post_count) }));

  try {
    await cacheService.set(TRENDING_TAGS_CACHE_KEY, trendingTags, CACHE_TTL.TRENDING_TAGS);
  } catch (error) {
    logger.warn(`Cache write failed for "${TRENDING_TAGS_CACHE_KEY}": ${describeError(error)}`);
  }

  return trendingTags;
};

const upsertHashtagBucket = (bucketStart: Date, bucketEnd: Date) => prisma.$executeRaw`
  INSERT INTO hashtag_trend_metrics (id, tag, bucket_start, post_count, updated_at)
  SELECT gen_random_uuid(), h.tag, ${bucketStart}, COUNT(*), now()
  FROM creator_look_hashtags h
  JOIN creator_looks cl ON cl.id = h.creator_look_id
  WHERE cl.created_at >= ${bucketStart} AND cl.created_at < ${bucketEnd} AND cl.deleted_at IS NULL
  GROUP BY h.tag
  ON CONFLICT (tag, bucket_start)
  DO UPDATE SET post_count = excluded.post_count, updated_at = now();
`;

const upsertHashtagBucketForHour = (bucketStart: Date): Promise<unknown> =>
  upsertHashtagBucket(bucketStart, new Date(bucketStart.getTime() + HOUR_MS));

const listRecentTagMetricBuckets = async (sinceDays: number): Promise<TagMetricBucket[]> => {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  return prisma.hashtagTrendMetric.findMany({
    where: { bucketStart: { gte: since } },
    select: { tag: true, bucketStart: true, postCount: true },
  });
};

const computeRankedTagScores = async (): Promise<TagScoreBreakdown[]> => {
  const now = new Date();
  const buckets = await listRecentTagMetricBuckets(TAG_TREND_BASELINE_WINDOW_DAYS);
  const bucketsByTag = groupTagBucketsByTag(buckets);
  const globalBaseline = computeGlobalTagBaseline(
    bucketsByTag,
    now,
    TAG_TREND_BASELINE_WINDOW_DAYS,
  );

  const candidates: TagScoreBreakdown[] = [];
  for (const [tag, tagBuckets] of bucketsByTag) {
    const hasRecentBucket = tagBuckets.some(
      (bucket) => ageHoursOf(bucket, now) < TAG_TREND_RECENT_METRICS_WINDOW_HOURS,
    );
    if (!hasRecentBucket) continue;

    const breakdown = scoreTag({ tag, buckets: tagBuckets, globalBaseline, now });
    if (breakdown.score > 0) candidates.push(breakdown);
  }

  candidates.sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag));
  return candidates;
};

const TAG_TREND_SCORE_CACHE_KEY = redisKeys.cache("explore-tag-trend-score", "global");
const TAG_TREND_SCORE_RECOMPUTE_LOCK_KEY = redisKeys.lock("tag-trend-score-recompute");

const tagTrendScoreCacheTtl = (scored: TagScoreBreakdown[]): number =>
  scored.length > 0 ? CACHE_TTL.TAG_TREND_SCORE : CACHE_TTL.TAG_TREND_SCORE_EMPTY;

const getOrRecomputeTagScores = async (): Promise<TagScoreBreakdown[]> => {
  let cached: TagScoreBreakdown[] | null = null;
  try {
    cached = await cacheService.get<TagScoreBreakdown[]>(TAG_TREND_SCORE_CACHE_KEY);
  } catch (error) {
    logger.warn(`Cache read failed for "${TAG_TREND_SCORE_CACHE_KEY}": ${describeError(error)}`);
  }
  if (cached !== null) return cached;

  try {
    const recomputed = await cacheService.withLock(
      TAG_TREND_SCORE_RECOMPUTE_LOCK_KEY,
      TAG_TREND_SCORE_RECOMPUTE_LOCK_TTL_MS,
      async () => {
        logger.info(
          `On-demand tag trend score recompute triggered (cache miss for "${TAG_TREND_SCORE_CACHE_KEY}")`,
        );
        const fresh = await computeRankedTagScores();
        await cacheService.set(TAG_TREND_SCORE_CACHE_KEY, fresh, tagTrendScoreCacheTtl(fresh));
        return fresh;
      },
    );
    return recomputed ?? [];
  } catch (error) {
    logger.warn(`On-demand tag trend score recompute failed: ${describeError(error)}`);
    return [];
  }
};

const fetchTrendingTags = async (): Promise<TrendingTag[]> => {
  const scored = await getOrRecomputeTagScores();
  if (scored.length === 0) return fetchLegacyTrendingTags();

  return scored
    .slice(0, TAG_TRENDING_LIMIT)
    .map((entry) => ({ tag: entry.tag, postCount: entry.recentActivity.postCount }));
};

export const creatorLookHashtagTrendingRepository = {
  async trendingTags(): Promise<TrendingTag[]> {
    return fetchTrendingTags();
  },

  async upsertHourlyTagMetrics(bucketStart: Date): Promise<void> {
    const previousBucketStart = new Date(bucketStart.getTime() - HOUR_MS);
    await Promise.all([
      upsertHashtagBucketForHour(bucketStart),
      upsertHashtagBucketForHour(previousBucketStart),
    ]);
  },

  async deleteTagTrendMetricsOlderThan(cutoff: Date): Promise<number> {
    const { count } = await prisma.hashtagTrendMetric.deleteMany({
      where: { bucketStart: { lt: cutoff } },
    });
    return count;
  },

  async computeRankedTrendingTags(): Promise<TagScoreBreakdown[]> {
    return computeRankedTagScores();
  },

  async cacheRankedTrendingTags(ranked: TagScoreBreakdown[]): Promise<void> {
    try {
      await cacheService.set(TAG_TREND_SCORE_CACHE_KEY, ranked, tagTrendScoreCacheTtl(ranked));
    } catch (error) {
      logger.warn(`Cache write failed for "${TAG_TREND_SCORE_CACHE_KEY}": ${describeError(error)}`);
    }
  },
};
