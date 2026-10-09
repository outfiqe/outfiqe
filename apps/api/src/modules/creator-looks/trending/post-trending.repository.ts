import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { CreatorStatus } from "#generated/prisma/enums.js";
import { ageHoursOf } from "#lib/trend-scoring.utils.js";
import logger from "#lib/winston.utils.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, CREATOR_MOMENTUM_SCORE_CACHE_KEY, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import {
  HOUR_MS,
  OLDER_LOOKS_FALLBACK_LIMIT,
  RECENT_LOOKS_MIN_POOL_SIZE,
  TREND_BASELINE_WINDOW_DAYS,
  TREND_RECENT_METRICS_WINDOW_HOURS,
  TRENDING_SCORE_RECOMPUTE_LOCK_TTL_MS,
} from "../creator-look.constants.js";
import type {
  CreatorMomentumEntry,
  PostMetricBucket,
  PostScoreBreakdown,
  PostTrendingEntry,
  PostTrendMeta,
} from "../creator-look.types.js";
import {
  computeGlobalPostBaseline,
  groupPostBucketsByLook,
  scoreCreatorMomentum,
  scorePost,
} from "./post-scoring.utils.js";

const TRENDING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const upsertPostLikesBucket = (bucketStart: Date, bucketEnd: Date) => prisma.$executeRaw`
  INSERT INTO creator_look_trend_metrics (id, creator_look_id, bucket_start, likes, updated_at)
  SELECT gen_random_uuid(), creator_look_id, ${bucketStart}, COUNT(*), now()
  FROM creator_look_likes
  WHERE created_at >= ${bucketStart} AND created_at < ${bucketEnd}
  GROUP BY creator_look_id
  ON CONFLICT (creator_look_id, bucket_start)
  DO UPDATE SET likes = excluded.likes, updated_at = now();
`;

const upsertPostCommentsBucket = (bucketStart: Date, bucketEnd: Date) => prisma.$executeRaw`
  INSERT INTO creator_look_trend_metrics (id, creator_look_id, bucket_start, comments, updated_at)
  SELECT gen_random_uuid(), creator_look_id, ${bucketStart}, COUNT(*), now()
  FROM creator_look_comments
  WHERE created_at >= ${bucketStart} AND created_at < ${bucketEnd} AND deleted_at IS NULL
  GROUP BY creator_look_id
  ON CONFLICT (creator_look_id, bucket_start)
  DO UPDATE SET comments = excluded.comments, updated_at = now();
`;

const upsertPostSavesBucket = (bucketStart: Date, bucketEnd: Date) => prisma.$executeRaw`
  INSERT INTO creator_look_trend_metrics (id, creator_look_id, bucket_start, saves, updated_at)
  SELECT gen_random_uuid(), creator_look_id, ${bucketStart}, COUNT(*), now()
  FROM creator_look_saves
  WHERE created_at >= ${bucketStart} AND created_at < ${bucketEnd}
  GROUP BY creator_look_id
  ON CONFLICT (creator_look_id, bucket_start)
  DO UPDATE SET saves = excluded.saves, updated_at = now();
`;

const upsertPostTagClicksBucket = (bucketStart: Date, bucketEnd: Date) => prisma.$executeRaw`
  INSERT INTO creator_look_trend_metrics (id, creator_look_id, bucket_start, tag_clicks, updated_at)
  SELECT gen_random_uuid(), creator_look_id, ${bucketStart}, COUNT(DISTINCT session_id), now()
  FROM creator_look_tag_clicks
  WHERE created_at >= ${bucketStart} AND created_at < ${bucketEnd}
  GROUP BY creator_look_id
  ON CONFLICT (creator_look_id, bucket_start)
  DO UPDATE SET tag_clicks = excluded.tag_clicks, updated_at = now();
`;

const upsertPostMetricsForHour = (bucketStart: Date): Promise<unknown> => {
  const bucketEnd = new Date(bucketStart.getTime() + HOUR_MS);
  return Promise.all([
    upsertPostLikesBucket(bucketStart, bucketEnd),
    upsertPostCommentsBucket(bucketStart, bucketEnd),
    upsertPostSavesBucket(bucketStart, bucketEnd),
    upsertPostTagClicksBucket(bucketStart, bucketEnd),
  ]);
};

const EXPLORE_TRENDING_SCORE_CACHE_KEY = redisKeys.cache("explore-trending-score", "global");
const TRENDING_SCORE_RECOMPUTE_LOCK_KEY = redisKeys.lock("explore-trending-score-recompute");

const listNewestApprovedLookIdsCreatedBefore = async (
  before: Date,
  limit: number,
): Promise<string[]> => {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT cl.id
    FROM creator_looks cl
    JOIN users u ON u.id = cl.creator_id
    WHERE cl.deleted_at IS NULL
      AND u.creator_status = 'APPROVED'
      AND cl.created_at < ${before}
    ORDER BY cl.created_at DESC, cl.id DESC
    LIMIT ${limit}
  `);
  return rows.map((row) => row.id);
};

export const buildLegacyTrendingSnapshot = async (): Promise<string[]> => {
  const since = new Date(Date.now() - TRENDING_WINDOW_MS);
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT cl.id
    FROM creator_looks cl
    JOIN users u ON u.id = cl.creator_id
    WHERE cl.deleted_at IS NULL
      AND u.creator_status = 'APPROVED'
      AND cl.created_at >= ${since}
    ORDER BY (cl.like_count * 2 + cl.comment_count + cl.save_count) DESC, cl.created_at DESC, cl.id DESC
  `);
  const recentLookIds = rows.map((row) => row.id);
  if (recentLookIds.length >= RECENT_LOOKS_MIN_POOL_SIZE) return recentLookIds;

  const olderLookIds = await listNewestApprovedLookIdsCreatedBefore(
    since,
    OLDER_LOOKS_FALLBACK_LIMIT,
  );
  return [...recentLookIds, ...olderLookIds];
};

const listRecentPostMetricBuckets = async (sinceDays: number): Promise<PostMetricBucket[]> => {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.creatorLookTrendMetric.findMany({
    where: { bucketStart: { gte: since } },
    orderBy: [{ creatorLookId: "asc" }, { bucketStart: "asc" }],
    select: {
      creatorLookId: true,
      bucketStart: true,
      likes: true,
      comments: true,
      saves: true,
      tagClicks: true,
    },
  });
  return rows.map((row) => ({
    lookId: row.creatorLookId,
    bucketStart: row.bucketStart,
    likes: row.likes,
    comments: row.comments,
    saves: row.saves,
    tagClicks: row.tagClicks,
  }));
};

const listActivePostMeta = (lookIds: string[]): Promise<PostTrendMeta[]> =>
  lookIds.length === 0
    ? Promise.resolve([])
    : prisma.creatorLook.findMany({
        where: {
          id: { in: lookIds },
          deletedAt: null,
          creator: { creatorStatus: CreatorStatus.APPROVED },
        },
        select: { id: true, creatorId: true, createdAt: true },
      });

type RecentPostBucketsWithMeta = {
  bucketsByLook: Map<string, PostMetricBucket[]>;
  metaById: Map<string, PostTrendMeta>;
};

const fetchRecentPostBucketsWithMeta = async (): Promise<RecentPostBucketsWithMeta> => {
  const buckets = await listRecentPostMetricBuckets(TREND_BASELINE_WINDOW_DAYS);
  const bucketsByLook = groupPostBucketsByLook(buckets);

  const meta = await listActivePostMeta([...bucketsByLook.keys()]);
  const metaById = new Map(meta.map((row) => [row.id, row]));

  return { bucketsByLook, metaById };
};

const computeRankedLookScores = async (
  prefetched?: RecentPostBucketsWithMeta,
): Promise<PostTrendingEntry[]> => {
  const now = new Date();
  const { bucketsByLook, metaById } = prefetched ?? (await fetchRecentPostBucketsWithMeta());

  const globalBaseline = computeGlobalPostBaseline(bucketsByLook, now, TREND_BASELINE_WINDOW_DAYS);

  const candidates: PostScoreBreakdown[] = [];
  for (const [lookId, lookBuckets] of bucketsByLook) {
    const lookMeta = metaById.get(lookId);
    if (!lookMeta) continue;

    const hasRecentBucket = lookBuckets.some(
      (bucket) => ageHoursOf(bucket, now) < TREND_RECENT_METRICS_WINDOW_HOURS,
    );
    if (!hasRecentBucket) continue;

    const breakdown = scorePost({
      lookId,
      creatorId: lookMeta.creatorId,
      buckets: lookBuckets,
      lookCreatedAt: lookMeta.createdAt,
      globalBaseline,
      now,
    });
    if (breakdown.score > 0) candidates.push(breakdown);
  }

  candidates.sort((a, b) => b.score - a.score || a.lookId.localeCompare(b.lookId));
  return candidates.map(({ lookId, score }) => ({ lookId, score }));
};

const groupPostBucketsByCreator = (
  bucketsByLook: Map<string, PostMetricBucket[]>,
  metaById: Map<string, PostTrendMeta>,
): Map<string, PostMetricBucket[]> => {
  const grouped = new Map<string, PostMetricBucket[]>();
  for (const [lookId, lookBuckets] of bucketsByLook) {
    const creatorId = metaById.get(lookId)?.creatorId;
    if (!creatorId) continue;

    const existing = grouped.get(creatorId);
    if (existing) existing.push(...lookBuckets);
    else grouped.set(creatorId, [...lookBuckets]);
  }
  return grouped;
};

const computeRankedCreatorMomentumScores = async (
  prefetched?: RecentPostBucketsWithMeta,
): Promise<CreatorMomentumEntry[]> => {
  const now = new Date();
  const { bucketsByLook, metaById } = prefetched ?? (await fetchRecentPostBucketsWithMeta());

  const bucketsByCreator = groupPostBucketsByCreator(bucketsByLook, metaById);
  const globalBaseline = computeGlobalPostBaseline(
    bucketsByCreator,
    now,
    TREND_BASELINE_WINDOW_DAYS,
  );

  const candidates: CreatorMomentumEntry[] = [];
  for (const [creatorId, creatorBuckets] of bucketsByCreator) {
    const hasRecentBucket = creatorBuckets.some(
      (bucket) => ageHoursOf(bucket, now) < TREND_RECENT_METRICS_WINDOW_HOURS,
    );
    if (!hasRecentBucket) continue;

    const entry = scoreCreatorMomentum({ creatorId, buckets: creatorBuckets, globalBaseline, now });
    if (entry.momentum > 0) candidates.push(entry);
  }

  candidates.sort((a, b) => b.momentum - a.momentum || a.creatorId.localeCompare(b.creatorId));
  return candidates;
};

const trendingScoreCacheTtl = (ranked: PostTrendingEntry[]): number =>
  ranked.length > 0 ? CACHE_TTL.EXPLORE_TRENDING_SCORE : CACHE_TTL.EXPLORE_TRENDING_SCORE_EMPTY;

export const getOrRecomputeTrendingScores = async (): Promise<PostTrendingEntry[]> => {
  let scored: PostTrendingEntry[] | null = null;
  try {
    scored = await cacheService.get<PostTrendingEntry[]>(EXPLORE_TRENDING_SCORE_CACHE_KEY);
  } catch (error) {
    logger.warn(
      `Cache read failed for "${EXPLORE_TRENDING_SCORE_CACHE_KEY}": ${describeError(error)}`,
    );
  }
  if (scored !== null) return scored;

  try {
    const recomputed = await cacheService.withLock(
      TRENDING_SCORE_RECOMPUTE_LOCK_KEY,
      TRENDING_SCORE_RECOMPUTE_LOCK_TTL_MS,
      async () => {
        logger.info(
          `On-demand trending score recompute triggered (cache miss for "${EXPLORE_TRENDING_SCORE_CACHE_KEY}")`,
        );
        const fresh = await computeRankedLookScores();
        await cacheService.set(
          EXPLORE_TRENDING_SCORE_CACHE_KEY,
          fresh,
          trendingScoreCacheTtl(fresh),
        );
        return fresh;
      },
    );
    return recomputed ?? [];
  } catch (error) {
    logger.warn(`On-demand trending score recompute failed: ${describeError(error)}`);
    return [];
  }
};

export const creatorLookPostTrendingRepository = {
  async upsertHourlyPostMetrics(bucketStart: Date): Promise<void> {
    const previousBucketStart = new Date(bucketStart.getTime() - HOUR_MS);
    await Promise.all([
      upsertPostMetricsForHour(bucketStart),
      upsertPostMetricsForHour(previousBucketStart),
    ]);
  },

  async deleteTrendMetricsOlderThan(cutoff: Date): Promise<number> {
    const { count } = await prisma.creatorLookTrendMetric.deleteMany({
      where: { bucketStart: { lt: cutoff } },
    });
    return count;
  },

  async computeRankedTrendingLookIds(): Promise<PostTrendingEntry[]> {
    return computeRankedLookScores();
  },

  async computeRankedTrendingScoreAndCreatorMomentum(): Promise<{
    postScores: PostTrendingEntry[];
    creatorMomentum: CreatorMomentumEntry[];
  }> {
    const prefetched = await fetchRecentPostBucketsWithMeta();
    const [postScores, creatorMomentum] = await Promise.all([
      computeRankedLookScores(prefetched),
      computeRankedCreatorMomentumScores(prefetched),
    ]);
    return { postScores, creatorMomentum };
  },

  async cacheRankedTrendingScore(ranked: PostTrendingEntry[]): Promise<void> {
    try {
      await cacheService.set(
        EXPLORE_TRENDING_SCORE_CACHE_KEY,
        ranked,
        trendingScoreCacheTtl(ranked),
      );
    } catch (error) {
      logger.warn(
        `Cache write failed for "${EXPLORE_TRENDING_SCORE_CACHE_KEY}": ${describeError(error)}`,
      );
    }
  },

  async computeRankedCreatorMomentumScores(): Promise<CreatorMomentumEntry[]> {
    return computeRankedCreatorMomentumScores();
  },

  async cacheRankedCreatorMomentumScores(ranked: CreatorMomentumEntry[]): Promise<void> {
    try {
      await cacheService.set(
        CREATOR_MOMENTUM_SCORE_CACHE_KEY,
        ranked,
        CACHE_TTL.CREATOR_MOMENTUM_SCORE,
      );
    } catch (error) {
      logger.warn(
        `Cache write failed for "${CREATOR_MOMENTUM_SCORE_CACHE_KEY}": ${describeError(error)}`,
      );
    }
  },
};
