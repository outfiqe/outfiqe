import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { computeViewerEngagementAffinity } from "#lib/creator-engagement-affinity.utils.js";
import { decodeCursor, encodeCursor } from "#lib/pagination.utils.js";
import { applyDiversity } from "#lib/trend-scoring.utils.js";
import logger from "#lib/winston.utils.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import {
  FOR_YOU_ANONYMOUS_TRENDING_BOOST,
  FOR_YOU_ENGAGED_CREATOR_BOOST,
  FOR_YOU_ENGAGEMENT_LOOKBACK_DAYS,
  FOR_YOU_FOLLOW_BOOST,
  FOR_YOU_FOLLOWED_MAX_INJECTED,
  FOR_YOU_FOLLOWED_RECENCY_WINDOW_DAYS,
  FOR_YOU_FOLLOWED_SLOT_INTERVAL,
  FOR_YOU_HASHTAG_BOOST_CAP,
  FOR_YOU_HASHTAG_BOOST_PER_MATCH,
  FOR_YOU_HASHTAG_MATCH_WEIGHT_CAP,
  FOR_YOU_LEGACY_POSITION_DECAY,
  FOR_YOU_MAX_PER_CREATOR,
  TRENDING_HYBRID_MIN_SCORED_POOL_SIZE,
} from "../creator-look.constants.js";
import type {
  CandidateAffinityMeta,
  FeedCandidateSnapshot,
  PostTrendingEntry,
  ViewerAffinity,
} from "../creator-look.types.js";
import type { TrendingSnapshotCursor } from "../creator-look.utils.js";
import {
  buildLegacyTrendingSnapshot,
  getOrRecomputeTrendingScores,
} from "../trending/post-trending.repository.js";
import { interleaveFollowedLooks, isEmptySnapshot } from "./feed.utils.js";

const listCandidateAffinityMeta = async (lookIds: string[]): Promise<CandidateAffinityMeta[]> => {
  if (lookIds.length === 0) return [];
  const rows = await prisma.creatorLook.findMany({
    where: { id: { in: lookIds } },
    select: { id: true, creatorId: true, hashtags: { select: { tag: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    creatorId: row.creatorId,
    hashtags: row.hashtags.map((hashtag) => hashtag.tag),
  }));
};

const listRecentFollowedLookIds = async (
  followedCreatorIds: string[],
  sinceDays: number,
  limit: number,
): Promise<string[]> => {
  if (followedCreatorIds.length === 0) return [];
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM (
      SELECT id, created_at,
        ROW_NUMBER() OVER (PARTITION BY creator_id ORDER BY created_at DESC) AS rank_in_creator
      FROM creator_looks
      WHERE creator_id IN (${Prisma.join(followedCreatorIds)})
        AND deleted_at IS NULL
        AND created_at >= ${since}
    ) ranked
    WHERE rank_in_creator <= ${FOR_YOU_MAX_PER_CREATOR}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  return rows.map((row) => row.id);
};

const scorePersonalized = (
  candidate: PostTrendingEntry,
  meta: CandidateAffinityMeta,
  affinity: ViewerAffinity,
): number => {
  let multiplier = 1;

  if (affinity.followedCreatorIds.has(meta.creatorId)) {
    multiplier += FOR_YOU_FOLLOW_BOOST;
  } else if (affinity.engagedCreatorIds.has(meta.creatorId)) {
    multiplier += FOR_YOU_ENGAGED_CREATOR_BOOST;
  }

  const hashtagBoost = meta.hashtags.reduce((sum, tag) => {
    const weight = affinity.hashtagWeights.get(tag);
    if (!weight) return sum;
    return (
      sum + FOR_YOU_HASHTAG_BOOST_PER_MATCH * Math.min(weight, FOR_YOU_HASHTAG_MATCH_WEIGHT_CAP)
    );
  }, 0);
  multiplier += Math.min(hashtagBoost, FOR_YOU_HASHTAG_BOOST_CAP);

  return candidate.score * multiplier;
};

const padWithRecentLooksWhenPoolIsSmall = async (
  scored: PostTrendingEntry[],
): Promise<PostTrendingEntry[]> => {
  if (scored.length >= TRENDING_HYBRID_MIN_SCORED_POOL_SIZE) return scored;

  const scoredIdSet = new Set(scored.map((entry) => entry.lookId));
  const recentLookIds = (await buildLegacyTrendingSnapshot()).filter(
    (lookId) => !scoredIdSet.has(lookId),
  );
  const lowestScoredScore = scored.length > 0 ? Math.min(...scored.map((entry) => entry.score)) : 1;
  const recentEntries = recentLookIds.map((lookId, index) => ({
    lookId,
    score: lowestScoredScore * FOR_YOU_LEGACY_POSITION_DECAY ** (index + 1),
  }));
  return [...scored, ...recentEntries];
};

const buildPersonalizedSnapshot = async (
  viewerId: string,
  followedCreatorIds: string[],
): Promise<FeedCandidateSnapshot> => {
  const followedLookIds = await listRecentFollowedLookIds(
    followedCreatorIds,
    FOR_YOU_FOLLOWED_RECENCY_WINDOW_DAYS,
    FOR_YOU_FOLLOWED_MAX_INJECTED,
  );

  const scored = await getOrRecomputeTrendingScores();
  const scoredIdSet = new Set(scored.map((entry) => entry.lookId));
  const candidatePool = await padWithRecentLooksWhenPoolIsSmall(scored);

  if (candidatePool.length === 0) {
    return {
      ids: interleaveFollowedLooks([], followedLookIds, FOR_YOU_FOLLOWED_SLOT_INTERVAL),
      trendingIds: [],
    };
  }

  const [candidateMeta, engagement] = await Promise.all([
    listCandidateAffinityMeta(candidatePool.map((candidate) => candidate.lookId)),
    computeViewerEngagementAffinity(viewerId, FOR_YOU_ENGAGEMENT_LOOKBACK_DAYS),
  ]);
  const metaById = new Map(candidateMeta.map((row) => [row.id, row]));
  const affinity: ViewerAffinity = {
    followedCreatorIds: new Set(followedCreatorIds),
    engagedCreatorIds: engagement.engagedCreatorIds,
    hashtagWeights: engagement.hashtagWeights,
  };

  const personalized = candidatePool
    .map((candidate) => {
      const meta = metaById.get(candidate.lookId);
      if (!meta) return null;
      return {
        lookId: candidate.lookId,
        creatorId: meta.creatorId,
        score: scorePersonalized(candidate, meta, affinity),
      };
    })
    .filter(
      (entry): entry is { lookId: string; creatorId: string; score: number } => entry !== null,
    )
    .sort((a, b) => b.score - a.score);

  const diversified = applyDiversity(
    personalized,
    personalized.length,
    FOR_YOU_MAX_PER_CREATOR,
    (entry) => entry.creatorId,
  );
  const discoveryIds = diversified.map((entry) => entry.lookId);
  return {
    ids: interleaveFollowedLooks(discoveryIds, followedLookIds, FOR_YOU_FOLLOWED_SLOT_INTERVAL),
    trendingIds: discoveryIds.filter((lookId) => scoredIdSet.has(lookId)),
  };
};

const buildAnonymousForYouSnapshot = async (): Promise<FeedCandidateSnapshot> => {
  const [scored, legacyIds] = await Promise.all([
    getOrRecomputeTrendingScores(),
    buildLegacyTrendingSnapshot(),
  ]);

  const trendingIdSet = new Set(scored.map((entry) => entry.lookId));
  const candidateIds = legacyIds.length > 0 ? legacyIds : scored.map((entry) => entry.lookId);
  if (candidateIds.length === 0) return { ids: [], trendingIds: [] };

  const candidateMeta = await listCandidateAffinityMeta(candidateIds);
  const creatorIdByLookId = new Map(candidateMeta.map((meta) => [meta.id, meta.creatorId]));

  const ranked = candidateIds
    .map((lookId, index) => ({
      lookId,
      creatorId: creatorIdByLookId.get(lookId) ?? lookId,
      score:
        FOR_YOU_LEGACY_POSITION_DECAY ** index *
        (trendingIdSet.has(lookId) ? 1 + FOR_YOU_ANONYMOUS_TRENDING_BOOST : 1),
    }))
    .sort((a, b) => b.score - a.score);

  const diversified = applyDiversity(
    ranked,
    ranked.length,
    FOR_YOU_MAX_PER_CREATOR,
    (entry) => entry.creatorId,
  );
  const diversifiedIds = diversified.map((entry) => entry.lookId);

  return {
    ids: diversifiedIds,
    trendingIds: diversifiedIds.filter((id) => trendingIdSet.has(id)),
  };
};

const forYouSnapshotKey = (sessionId: string) =>
  redisKeys.cache("explore-for-you-snapshot", sessionId);

const getForYouSnapshot = async (sessionId: string): Promise<FeedCandidateSnapshot | null> => {
  const key = forYouSnapshotKey(sessionId);
  try {
    const cached = await cacheService.get<FeedCandidateSnapshot>(key);
    if (cached) await cacheService.touch(key, CACHE_TTL.EXPLORE_TRENDING_SNAPSHOT);
    return cached;
  } catch (error) {
    logger.warn(`Cache read failed for "${key}": ${describeError(error)}`);
    return null;
  }
};

const cacheForYouSnapshot = async (
  sessionId: string,
  snapshot: FeedCandidateSnapshot,
): Promise<void> => {
  if (isEmptySnapshot(snapshot)) return;
  try {
    await cacheService.set(
      forYouSnapshotKey(sessionId),
      snapshot,
      CACHE_TTL.EXPLORE_TRENDING_SNAPSHOT,
    );
  } catch (error) {
    logger.warn(
      `Cache write failed for "${forYouSnapshotKey(sessionId)}": ${describeError(error)}`,
    );
  }
};

const forYouStableRankingKey = (viewerId: string) =>
  redisKeys.cache("explore-for-you-stable-ranking", viewerId);

const resolveForYouCandidateIds = async (
  viewerId: string | undefined,
  followedCreatorIds: string[],
): Promise<FeedCandidateSnapshot> => {
  if (!viewerId) return buildAnonymousForYouSnapshot();

  const stableKey = forYouStableRankingKey(viewerId);
  try {
    const stable = await cacheService.get<FeedCandidateSnapshot>(stableKey);
    if (stable) return stable;
  } catch (error) {
    logger.warn(`Cache read failed for "${stableKey}": ${describeError(error)}`);
  }

  const fresh = await buildPersonalizedSnapshot(viewerId, followedCreatorIds);
  if (isEmptySnapshot(fresh)) return fresh;
  try {
    await cacheService.set(stableKey, fresh, CACHE_TTL.EXPLORE_FOR_YOU_STABLE_RANKING);
  } catch (error) {
    logger.warn(`Cache write failed for "${stableKey}": ${describeError(error)}`);
  }
  return fresh;
};

export const listForYouIds = async ({
  cursor,
  limit,
  viewerId,
  followedCreatorIds,
}: {
  cursor?: string;
  limit: number;
  viewerId?: string;
  followedCreatorIds: string[];
}): Promise<{ ids: string[]; nextCursor: string | null; trendingIds: Set<string> }> => {
  const decoded = decodeCursor<TrendingSnapshotCursor>(cursor);
  const cachedSnapshot = decoded ? await getForYouSnapshot(decoded.sessionId) : null;

  let sessionId: string;
  let offset: number;
  let snapshot: FeedCandidateSnapshot;

  if (decoded && cachedSnapshot) {
    ({ sessionId, offset } = decoded);
    snapshot = cachedSnapshot;
  } else {
    sessionId = decoded?.sessionId ?? randomUUID();
    snapshot = await resolveForYouCandidateIds(viewerId, followedCreatorIds);
    offset = decoded ? Math.min(decoded.offset, snapshot.ids.length) : 0;
    await cacheForYouSnapshot(sessionId, snapshot);
  }

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
