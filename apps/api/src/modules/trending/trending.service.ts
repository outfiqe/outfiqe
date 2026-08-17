import { randomUUID } from "node:crypto";

import type { ProductType } from "#generated/prisma/enums.js";
import { decodeCursor, encodeCursor } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import {
  BASELINE_WINDOW_DAYS,
  CANDIDATE_POOL_SIZE,
  DIVERSE_POOL_LIMIT,
  MAX_PER_BRAND,
  METRIC_RETENTION_DAYS,
  RECENT_METRICS_WINDOW_HOURS,
  ROTATION_TIE_BAND,
  SCORING_INTERVAL_MS,
} from "./trending.constants.js";
import { trendingRepository } from "./trending.repository.js";
import type {
  MetricBucket,
  ProductScoreBreakdown,
  TrendDebugSnapshot,
  TrendingEntry,
  TrendingProductPage,
  TrendingSnapshotCursor,
} from "./trending.types.js";
import {
  ageHoursOf,
  applyDiversity,
  applyWeightedRotation,
  computeGroupBaselines,
  groupBucketsByProduct,
  scoreProduct,
  truncateToHour,
} from "./trending.utils.js";

const TRENDING_CACHE_KEY = redisKeys.cache("product-trending", "global");

const computeAllScoreBreakdowns = async (
  now: Date,
): Promise<{
  candidates: ProductScoreBreakdown[];
  bucketsByProduct: Map<string, MetricBucket[]>;
  categoryBaselines: Map<ProductType, number>;
  globalBaseline: number;
}> => {
  const buckets = await trendingRepository.listRecentMetricBuckets(BASELINE_WINDOW_DAYS);
  const bucketsByProduct = groupBucketsByProduct(buckets);

  const meta = await trendingRepository.listActiveProductMeta([...bucketsByProduct.keys()]);
  const metaById = new Map(meta.map((row) => [row.id, row]));

  const { byType: categoryBaselines, global: globalBaseline } = computeGroupBaselines(
    bucketsByProduct,
    metaById,
    now,
    BASELINE_WINDOW_DAYS,
  );

  const candidates: ProductScoreBreakdown[] = [];
  for (const [productId, productBuckets] of bucketsByProduct) {
    const productMeta = metaById.get(productId);
    if (!productMeta) continue;

    const hasRecentBucket = productBuckets.some(
      (bucket) => ageHoursOf(bucket, now) < RECENT_METRICS_WINDOW_HOURS,
    );
    if (!hasRecentBucket) continue;

    const breakdown = scoreProduct({
      productId,
      brandId: productMeta.brandId,
      buckets: productBuckets,
      productCreatedAt: productMeta.createdAt,
      productType: productMeta.type,
      categoryBaselines,
      globalBaseline,
      now,
    });
    if (breakdown.score > 0) candidates.push(breakdown);
  }

  candidates.sort((a, b) => b.score - a.score);
  return { candidates, bucketsByProduct, categoryBaselines, globalBaseline };
};

const trendingSnapshotKey = (sessionId: string) =>
  redisKeys.cache("product-trending-snapshot", sessionId);

const getTrendingSnapshot = async (sessionId: string): Promise<string[] | null> => {
  const key = trendingSnapshotKey(sessionId);
  try {
    const cached = await cacheService.get<string[]>(key);
    if (cached) await cacheService.touch(key, CACHE_TTL.PRODUCT_TRENDING_SNAPSHOT);
    return cached;
  } catch (error) {
    logger.warn(`Cache read failed for "${key}": ${describeError(error)}`);
    return null;
  }
};

const cacheTrendingSnapshot = async (sessionId: string, ids: string[]): Promise<void> => {
  const key = trendingSnapshotKey(sessionId);
  try {
    await cacheService.set(key, ids, CACHE_TTL.PRODUCT_TRENDING_SNAPSHOT);
  } catch (error) {
    logger.warn(`Cache write failed for "${key}": ${describeError(error)}`);
  }
};

const buildTrendingSnapshotIds = async (): Promise<string[]> => {
  const { candidates } = await computeAllScoreBreakdowns(new Date());
  return candidates.map((candidate) => candidate.productId);
};

const resolveTrendingSnapshotSource = async (
  decoded: TrendingSnapshotCursor | undefined,
): Promise<{ sessionId: string; offset: number; ids: string[] }> => {
  const cachedIds = decoded ? await getTrendingSnapshot(decoded.sessionId) : null;
  if (decoded && cachedIds) {
    return { sessionId: decoded.sessionId, offset: decoded.offset, ids: cachedIds };
  }

  const sessionId = randomUUID();
  const ids = await buildTrendingSnapshotIds();
  await cacheTrendingSnapshot(sessionId, ids);
  return { sessionId, offset: 0, ids };
};

const computeRankedTrendingProducts = async (): Promise<TrendingEntry[]> => {
  const now = new Date();
  const { candidates } = await computeAllScoreBreakdowns(now);

  const pool = candidates.slice(0, CANDIDATE_POOL_SIZE);
  const diverse = applyDiversity(pool, DIVERSE_POOL_LIMIT, MAX_PER_BRAND);
  const seed = Math.floor(now.getTime() / SCORING_INTERVAL_MS);
  const rotated = applyWeightedRotation(diverse, ROTATION_TIE_BAND, seed);

  return rotated.map(({ productId, score }) => ({ productId, score }));
};

export const trendingService = {
  async runAggregation(): Promise<{ bucketStart: Date; deletedBuckets: number }> {
    const bucketStart = truncateToHour(new Date());
    await trendingRepository.upsertHourlyMetrics(bucketStart);

    const retentionCutoff = new Date(Date.now() - METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const deletedBuckets = await trendingRepository.deleteMetricsOlderThan(retentionCutoff);

    return { bucketStart, deletedBuckets };
  },

  async runScoring(): Promise<{ ranked: TrendingEntry[] }> {
    const ranked = await computeRankedTrendingProducts();
    await cacheService.set(TRENDING_CACHE_KEY, ranked, CACHE_TTL.PRODUCT_TRENDING);
    return { ranked };
  },

  async getTrendingProductIds(limit: number): Promise<string[]> {
    const cached = await cacheService.get<TrendingEntry[]>(TRENDING_CACHE_KEY);
    const ranked = cached ?? (await computeRankedTrendingProducts());
    return ranked.slice(0, limit).map((entry) => entry.productId);
  },

  async listTrendingProductIds({
    cursor,
    limit,
  }: {
    cursor?: string;
    limit: number;
  }): Promise<TrendingProductPage> {
    const decoded = decodeCursor<TrendingSnapshotCursor>(cursor);
    const { sessionId, offset, ids } = await resolveTrendingSnapshotSource(decoded);

    const pageIds = ids.slice(offset, offset + limit);
    const nextOffset = offset + pageIds.length;
    const nextCursor =
      nextOffset < ids.length
        ? encodeCursor<TrendingSnapshotCursor>({ sessionId, offset: nextOffset })
        : null;

    return { ids: pageIds, nextCursor };
  },

  async getDebugSnapshot(productId: string): Promise<TrendDebugSnapshot | null> {
    const now = new Date();
    const [product] = await trendingRepository.listActiveProductMeta([productId]);
    if (!product) return null;

    const { candidates, bucketsByProduct, categoryBaselines, globalBaseline } =
      await computeAllScoreBreakdowns(now);
    const rankIndex = candidates.findIndex((candidate) => candidate.productId === productId);
    const rankedBreakdown = rankIndex >= 0 ? candidates[rankIndex] : undefined;
    if (rankedBreakdown) return { ...rankedBreakdown, rank: rankIndex + 1, scoredAt: now };

    const breakdown = scoreProduct({
      productId,
      brandId: product.brandId,
      buckets: bucketsByProduct.get(productId) ?? [],
      productCreatedAt: product.createdAt,
      productType: product.type,
      categoryBaselines,
      globalBaseline,
      now,
    });
    return { ...breakdown, rank: null, scoredAt: now };
  },
};
