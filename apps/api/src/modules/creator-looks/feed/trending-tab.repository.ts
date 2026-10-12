import { randomUUID } from "node:crypto";

import { decodeCursor, encodeCursor } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { TRENDING_HYBRID_MIN_SCORED_POOL_SIZE } from "../creator-look.constants.js";
import type { FeedCandidateSnapshot } from "../creator-look.types.js";
import type { TrendingSnapshotCursor } from "../creator-look.utils.js";
import {
  buildLegacyTrendingSnapshot,
  getOrRecomputeTrendingScores,
} from "../trending/post-trending.repository.js";
import { isEmptySnapshot } from "./feed.utils.js";

const trendingSnapshotKey = (sessionId: string) =>
  redisKeys.cache("explore-trending-snapshot", sessionId);

const refreshTrendingSnapshotTtl = async (key: string): Promise<void> => {
  try {
    await cacheService.touch(key, CACHE_TTL.EXPLORE_TRENDING_SNAPSHOT);
  } catch (error) {
    logger.warn(`Cache TTL refresh failed for "${key}": ${describeError(error)}`);
  }
};

const getTrendingSnapshot = async (sessionId: string): Promise<FeedCandidateSnapshot | null> => {
  const key = trendingSnapshotKey(sessionId);

  try {
    const cached = await cacheService.get<FeedCandidateSnapshot>(key);
    if (cached) await refreshTrendingSnapshotTtl(key);
    return cached;
  } catch (error) {
    logger.warn(`Cache read failed for "${key}": ${describeError(error)}`);
    return null;
  }
};

const cacheTrendingSnapshot = async (
  sessionId: string,
  snapshot: FeedCandidateSnapshot,
): Promise<void> => {
  if (isEmptySnapshot(snapshot)) return;
  try {
    await cacheService.set(
      trendingSnapshotKey(sessionId),
      snapshot,
      CACHE_TTL.EXPLORE_TRENDING_SNAPSHOT,
    );
  } catch (error) {
    logger.warn(
      `Cache write failed for "${trendingSnapshotKey(sessionId)}": ${describeError(error)}`,
    );
  }
};

const buildTrendingSnapshot = async (): Promise<FeedCandidateSnapshot> => {
  const scored = await getOrRecomputeTrendingScores();
  const scoredIds = scored.map((entry) => entry.lookId);

  if (scoredIds.length >= TRENDING_HYBRID_MIN_SCORED_POOL_SIZE) {
    return { ids: scoredIds, trendingIds: scoredIds };
  }

  const legacyIds = await buildLegacyTrendingSnapshot();
  const scoredIdSet = new Set(scoredIds);
  const fallbackIds = legacyIds.filter((id) => !scoredIdSet.has(id));
  return { ids: [...scoredIds, ...fallbackIds], trendingIds: scoredIds };
};

const resolveTrendingSnapshotSource = async (
  decoded: TrendingSnapshotCursor | undefined,
): Promise<{ sessionId: string; offset: number; snapshot: FeedCandidateSnapshot }> => {
  const cachedSnapshot = decoded ? await getTrendingSnapshot(decoded.sessionId) : null;
  if (decoded && cachedSnapshot) {
    return { sessionId: decoded.sessionId, offset: decoded.offset, snapshot: cachedSnapshot };
  }

  const sessionId = decoded?.sessionId ?? randomUUID();
  const snapshot = await buildTrendingSnapshot();
  await cacheTrendingSnapshot(sessionId, snapshot);
  const offset = decoded ? Math.min(decoded.offset, snapshot.ids.length) : 0;
  return { sessionId, offset, snapshot };
};

export const listTrendingIds = async ({
  cursor,
  limit,
}: {
  cursor?: string;
  limit: number;
}): Promise<{ ids: string[]; nextCursor: string | null; trendingIds: Set<string> }> => {
  const decoded = decodeCursor<TrendingSnapshotCursor>(cursor);
  const { sessionId, offset, snapshot } = await resolveTrendingSnapshotSource(decoded);

  const pageIds = snapshot.ids.slice(offset, offset + limit);
  const nextOffset = offset + pageIds.length;
  const nextCursor =
    nextOffset < snapshot.ids.length
      ? encodeCursor<TrendingSnapshotCursor>({ sessionId, offset: nextOffset })
      : null;

  const trendingIdSet = new Set(snapshot.trendingIds);
  return {
    ids: pageIds,
    nextCursor,
    trendingIds: new Set(pageIds.filter((id) => trendingIdSet.has(id))),
  };
};
