import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { AccountStatus, CreatorStatus, FollowTargetType } from "#generated/prisma/enums.js";
import {
  computeViewerEngagementAffinity,
  listCreatorsByHashtagAffinity,
} from "#lib/creator-engagement-affinity.utils.js";
import { decodeCursor, encodeCursor } from "#lib/pagination.utils.js";
import { applyWeightedRotation } from "#lib/trend-scoring.utils.js";
import logger from "#lib/winston.utils.js";
import type { UserRecord } from "#modules/users/user.types.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, CREATOR_MOMENTUM_SCORE_CACHE_KEY, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import {
  HASHTAG_CANDIDATE_LIMIT,
  HASHTAG_CANDIDATE_LOOKBACK_DAYS,
  HASHTAG_CANDIDATE_TOP_TAG_COUNT,
  MIN_MOMENTUM_DISCOVERY_SLOTS,
  MUTUAL_FOLLOW_CANDIDATE_LIMIT,
  SUGGESTED_CREATORS_LIMIT,
  SUGGESTION_CANDIDATE_POOL_SIZE,
  SUGGESTION_ENGAGEMENT_LOOKBACK_DAYS,
  SUGGESTION_ROTATION_TIE_BAND,
} from "../follow.constants.js";
import type {
  CandidateSignals,
  CreatorMomentumCacheEntry,
  MutualFollowCandidate,
  ScoredSuggestionCandidate,
  SuggestionSnapshotCursor,
} from "../follow.types.js";
import {
  compareSuggestionCandidatesByScore,
  ensureMomentumDiscoveryFloor,
  scoreSuggestionCandidate,
  suggestionRotationSeed,
} from "../follow.utils.js";
import { followGraphRepository } from "../graph/graph.repository.js";

const SUGGESTED_LIMIT = 10;
export const FOLLOWING_SCAN_CAP = 500;

const ELIGIBLE_SUGGESTED_CREATOR_WHERE = {
  isCreator: true,
  creatorStatus: CreatorStatus.APPROVED,
  accountStatus: AccountStatus.ACTIVE,
} as const;

const listLegacySuggestedCreators = async (userId: string): Promise<UserRecord[]> => {
  const excludeIds = [
    ...(await followGraphRepository.listFollowingIds(userId, FollowTargetType.USER)),
    userId,
  ];

  const ranked = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id
    FROM users
    WHERE id NOT IN (${Prisma.join(excludeIds)})
      AND is_creator = true
      AND creator_status = 'APPROVED'
      AND account_status = 'ACTIVE'
    ORDER BY follower_count DESC, id ASC
    LIMIT ${SUGGESTED_LIMIT}
  `);

  const users = await prisma.user.findMany({
    where: { id: { in: ranked.map((row) => row.id) } },
  });
  const byId = new Map(users.map((user) => [user.id, user]));
  return ranked.map((row) => byId.get(row.id)).filter((user): user is UserRecord => Boolean(user));
};

const listMutualFollowCandidates = async (
  viewerId: string,
  limit: number,
): Promise<MutualFollowCandidate[]> => {
  const rows = await prisma.$queryRaw<{ candidate_id: string; mutual_count: bigint }[]>(Prisma.sql`
    SELECT f2.following_id AS candidate_id, COUNT(*) AS mutual_count
    FROM follows f1
    JOIN follows f2
      ON f2.follower_id = f1.following_id AND f2.following_type = 'USER'
    WHERE f1.follower_id = ${viewerId} AND f1.following_type = 'USER'
      AND f2.following_id != ${viewerId}
    GROUP BY f2.following_id
    ORDER BY mutual_count DESC, f2.following_id ASC
    LIMIT ${limit}
  `);
  return rows.map((row) => ({
    candidateId: row.candidate_id,
    mutualCount: Number(row.mutual_count),
  }));
};

const readCreatorMomentumPool = async (poolSize: number): Promise<CreatorMomentumCacheEntry[]> => {
  try {
    const cached = await cacheService.get<CreatorMomentumCacheEntry[]>(
      CREATOR_MOMENTUM_SCORE_CACHE_KEY,
    );
    if (cached) return cached.slice(0, poolSize);
  } catch (error) {
    logger.warn(
      `Cache read failed for "${CREATOR_MOMENTUM_SCORE_CACHE_KEY}": ${describeError(error)}`,
    );
  }
  return [];
};

const buildRankedSuggestionIds = async (userId: string): Promise<string[]> => {
  const now = new Date();

  const [followingIds, mutualCandidates, affinity, momentumPool] = await Promise.all([
    followGraphRepository.listFollowingIds(userId, FollowTargetType.USER),
    listMutualFollowCandidates(userId, MUTUAL_FOLLOW_CANDIDATE_LIMIT),
    computeViewerEngagementAffinity(userId, SUGGESTION_ENGAGEMENT_LOOKBACK_DAYS),
    readCreatorMomentumPool(SUGGESTION_CANDIDATE_POOL_SIZE),
  ]);

  const topTags = [...affinity.hashtagWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, HASHTAG_CANDIDATE_TOP_TAG_COUNT)
    .map(([tag]) => tag);
  const hashtagCandidates = await listCreatorsByHashtagAffinity(
    topTags,
    HASHTAG_CANDIDATE_LOOKBACK_DAYS,
    HASHTAG_CANDIDATE_LIMIT,
  );

  const excludedIds = new Set([...followingIds, userId]);
  const mutualCountByCreatorId = new Map(
    mutualCandidates.map((candidate) => [candidate.candidateId, candidate.mutualCount]),
  );
  const hashtagMatchesByCreatorId = new Map(
    hashtagCandidates.map((candidate) => [candidate.creatorId, candidate.matchingPosts]),
  );
  const momentumByCreatorId = new Map(
    momentumPool.map((entry) => [entry.creatorId, entry.momentum]),
  );

  const candidateIds = new Set<string>([
    ...mutualCountByCreatorId.keys(),
    ...affinity.engagedCreatorIds,
    ...hashtagMatchesByCreatorId.keys(),
    ...momentumByCreatorId.keys(),
  ]);
  for (const id of excludedIds) candidateIds.delete(id);

  if (candidateIds.size === 0) {
    const legacy = await listLegacySuggestedCreators(userId);
    return legacy.map((user) => user.id);
  }

  const candidateUsers = await prisma.user.findMany({
    where: {
      id: { in: [...candidateIds] },
      ...ELIGIBLE_SUGGESTED_CREATOR_WHERE,
    },
  });
  if (candidateUsers.length === 0) {
    const legacy = await listLegacySuggestedCreators(userId);
    return legacy.map((user) => user.id);
  }

  const scoredCandidates: ScoredSuggestionCandidate[] = candidateUsers.map((user) => {
    const signals: CandidateSignals = {
      mutualFollowCount: mutualCountByCreatorId.get(user.id) ?? 0,
      engagedNotFollowed: affinity.engagedCreatorIds.has(user.id),
      hashtagMatchingPosts: hashtagMatchesByCreatorId.get(user.id) ?? 0,
      momentum: momentumByCreatorId.get(user.id) ?? 0,
      followerCount: user.followerCount,
      creatorApprovedAt: user.creatorApprovedAt,
    };
    return { creatorId: user.id, signals, score: scoreSuggestionCandidate(signals, now) };
  });
  scoredCandidates.sort(compareSuggestionCandidatesByScore);

  const rotated = applyWeightedRotation(
    scoredCandidates,
    SUGGESTION_ROTATION_TIE_BAND,
    suggestionRotationSeed(userId, now),
  );

  const firstPage = ensureMomentumDiscoveryFloor(
    rotated,
    SUGGESTED_CREATORS_LIMIT,
    MIN_MOMENTUM_DISCOVERY_SLOTS,
  );
  const firstPageIds = new Set(firstPage.map((candidate) => candidate.creatorId));
  const rest = rotated.filter((candidate) => !firstPageIds.has(candidate.creatorId));

  return [...firstPage, ...rest].map((candidate) => candidate.creatorId);
};

const suggestionSnapshotKey = (sessionId: string) =>
  redisKeys.cache("suggested-creators-snapshot", sessionId);

const getSuggestionSnapshot = async (sessionId: string): Promise<string[] | null> => {
  const key = suggestionSnapshotKey(sessionId);
  try {
    const cached = await cacheService.get<string[]>(key);
    if (cached) await cacheService.touch(key, CACHE_TTL.SUGGESTED_CREATORS_SNAPSHOT);
    return cached;
  } catch (error) {
    logger.warn(`Cache read failed for "${key}": ${describeError(error)}`);
    return null;
  }
};

const cacheSuggestionSnapshot = async (sessionId: string, ids: string[]): Promise<void> => {
  try {
    await cacheService.set(
      suggestionSnapshotKey(sessionId),
      ids,
      CACHE_TTL.SUGGESTED_CREATORS_SNAPSHOT,
    );
  } catch (error) {
    logger.warn(
      `Cache write failed for "${suggestionSnapshotKey(sessionId)}": ${describeError(error)}`,
    );
  }
};

const resolveSuggestionSnapshotSource = async (
  userId: string,
  decoded: SuggestionSnapshotCursor | undefined,
): Promise<{ sessionId: string; offset: number; ids: string[] }> => {
  const cachedIds = decoded ? await getSuggestionSnapshot(decoded.sessionId) : null;
  if (decoded && cachedIds) {
    return { sessionId: decoded.sessionId, offset: decoded.offset, ids: cachedIds };
  }

  const sessionId = decoded?.sessionId ?? randomUUID();
  const ids = await buildRankedSuggestionIds(userId);
  await cacheSuggestionSnapshot(sessionId, ids);
  const offset = decoded ? Math.min(decoded.offset, ids.length) : 0;
  return { sessionId, offset, ids };
};

export const followSuggestionRepository = {
  async suggestedCreators(
    userId: string,
    params: { cursor?: string; limit: number },
  ): Promise<{ items: UserRecord[]; nextCursor: string | null }> {
    const decoded = decodeCursor<SuggestionSnapshotCursor>(params.cursor);
    const { sessionId, offset, ids } = await resolveSuggestionSnapshotSource(userId, decoded);

    const pageIds = ids.slice(offset, offset + params.limit);
    const nextOffset = offset + pageIds.length;
    const nextCursor =
      nextOffset < ids.length
        ? encodeCursor<SuggestionSnapshotCursor>({ sessionId, offset: nextOffset })
        : null;

    if (pageIds.length === 0) return { items: [], nextCursor };

    const users = await prisma.user.findMany({
      where: { id: { in: pageIds }, ...ELIGIBLE_SUGGESTED_CREATOR_WHERE },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));
    const items = pageIds
      .map((id) => usersById.get(id))
      .filter((user): user is UserRecord => Boolean(user));

    return { items, nextCursor };
  },
};
