import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { CreatorStatus, FollowTargetType } from "#generated/prisma/enums.js";
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
} from "./follow.constants.js";
import type {
  CandidateSignals,
  CreatorMomentumCacheEntry,
  MutualFollowCandidate,
  ScoredSuggestionCandidate,
  SuggestionSnapshotCursor,
} from "./follow.types.js";
import {
  ensureMomentumDiscoveryFloor,
  scoreSuggestionCandidate,
  suggestionRotationSeed,
} from "./follow.utils.js";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const SUGGESTED_LIMIT = 10;
const FOLLOWING_SCAN_CAP = 500;

const getFollowerCount = async (
  tx: Tx,
  followingType: FollowTargetType,
  followingId: string,
): Promise<number> => {
  if (followingType === FollowTargetType.USER) {
    return (await tx.user.findUniqueOrThrow({ where: { id: followingId } })).followerCount;
  }
  return (await tx.brand.findUniqueOrThrow({ where: { id: followingId } })).followerCount;
};

const bumpFollowerCount = async (
  tx: Tx,
  followingType: FollowTargetType,
  followingId: string,
  delta: number,
): Promise<number> => {
  if (followingType === FollowTargetType.USER) {
    const user = await tx.user.update({
      where: { id: followingId },
      data: { followerCount: { increment: delta } },
    });
    return user.followerCount;
  }
  const brand = await tx.brand.update({
    where: { id: followingId },
    data: { followerCount: { increment: delta } },
  });
  return brand.followerCount;
};

const listLegacySuggestedCreators = async (userId: string): Promise<UserRecord[]> => {
  const excludeIds = [
    ...(await followRepository.listFollowingIds(userId, FollowTargetType.USER)),
    userId,
  ];

  const ranked = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id
    FROM users
    WHERE id NOT IN (${Prisma.join(excludeIds)})
      AND is_creator = true
    ORDER BY (creator_status = 'APPROVED') DESC, follower_count DESC
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
    ORDER BY mutual_count DESC
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
    followRepository.listFollowingIds(userId, FollowTargetType.USER),
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
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
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
  scoredCandidates.sort((a, b) => b.score - a.score);

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

export const followRepository = {
  async follow(
    followerId: string,
    followingType: FollowTargetType,
    followingId: string,
  ): Promise<{ created: boolean; followerCount: number }> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.follow.findUnique({
        where: { followerId_followingType_followingId: { followerId, followingType, followingId } },
      });
      if (existing) {
        return {
          created: false,
          followerCount: await getFollowerCount(tx, followingType, followingId),
        };
      }

      await tx.follow.create({ data: { followerId, followingType, followingId } });
      await tx.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      });
      const followerCount = await bumpFollowerCount(tx, followingType, followingId, 1);

      return { created: true, followerCount };
    });
  },

  async unfollow(
    followerId: string,
    followingType: FollowTargetType,
    followingId: string,
  ): Promise<{ deleted: boolean; followerCount: number }> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.follow.findUnique({
        where: { followerId_followingType_followingId: { followerId, followingType, followingId } },
      });
      if (!existing) {
        return {
          deleted: false,
          followerCount: await getFollowerCount(tx, followingType, followingId),
        };
      }

      await tx.follow.delete({
        where: { followerId_followingType_followingId: { followerId, followingType, followingId } },
      });
      await tx.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      });
      const followerCount = await bumpFollowerCount(tx, followingType, followingId, -1);

      return { deleted: true, followerCount };
    });
  },

  async isFollowing(
    followerId: string,
    followingType: FollowTargetType,
    followingId: string,
  ): Promise<boolean> {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingType_followingId: { followerId, followingType, followingId } },
    });
    return existing !== null;
  },

  async listFollowingIds(followerId: string, followingType: FollowTargetType): Promise<string[]> {
    const rows = await prisma.follow.findMany({
      where: { followerId, followingType },
      select: { followingId: true },
    });
    return rows.map((row) => row.followingId);
  },

  async listFollowingIdsAmong(
    followerId: string,
    followingType: FollowTargetType,
    followingIds: string[],
  ): Promise<string[]> {
    if (followingIds.length === 0) return [];

    const rows = await prisma.follow.findMany({
      where: { followerId, followingType, followingId: { in: followingIds } },
      select: { followingId: true },
    });
    return rows.map((row) => row.followingId);
  },

  async listFollowers(
    followingType: FollowTargetType,
    followingId: string,
    params: { cursor?: string; limit: number; q?: string },
  ): Promise<{ followerId: string; follower: UserRecord }[]> {
    return prisma.follow.findMany({
      where: {
        followingType,
        followingId,
        ...(params.q
          ? {
              follower: {
                OR: [
                  { name: { contains: params.q, mode: "insensitive" } },
                  { handle: { contains: params.q, mode: "insensitive" } },
                ],
              },
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { followerId: "desc" }],
      take: params.limit + 1,
      ...(params.cursor
        ? {
            cursor: {
              followerId_followingType_followingId: {
                followerId: params.cursor,
                followingType,
                followingId,
              },
            },
            skip: 1,
          }
        : {}),
      include: { follower: true },
    });
  },

  async findFollowedAmong(
    followerId: string,
    followingType: FollowTargetType,
    followingIds: string[],
  ): Promise<Set<string>> {
    if (followingIds.length === 0) return new Set();
    const rows = await prisma.follow.findMany({
      where: { followerId, followingType, followingId: { in: followingIds } },
      select: { followingId: true },
    });
    return new Set(rows.map((row) => row.followingId));
  },

  async listFollowingRows(
    followerId: string,
  ): Promise<{ followingType: FollowTargetType; followingId: string }[]> {
    return prisma.follow.findMany({
      where: { followerId },
      orderBy: [{ createdAt: "desc" }, { followingId: "desc" }],
      take: FOLLOWING_SCAN_CAP,
      select: { followingType: true, followingId: true },
    });
  },

  async suggestedCreators(
    userId: string,
    params: { cursor?: string; limit: number },
  ): Promise<{ items: UserRecord[]; nextCursor: string | null }> {
    const decoded = decodeCursor<SuggestionSnapshotCursor>(params.cursor);
    const cachedIds = decoded ? await getSuggestionSnapshot(decoded.sessionId) : null;

    let sessionId: string;
    let offset: number;
    let ids: string[];

    if (decoded && cachedIds) {
      ({ sessionId, offset } = decoded);
      ids = cachedIds;
    } else {
      sessionId = randomUUID();
      offset = 0;
      ids = await buildRankedSuggestionIds(userId);
      await cacheSuggestionSnapshot(sessionId, ids);
    }

    const pageIds = ids.slice(offset, offset + params.limit);
    const nextOffset = offset + pageIds.length;
    const nextCursor =
      nextOffset < ids.length
        ? encodeCursor<SuggestionSnapshotCursor>({ sessionId, offset: nextOffset })
        : null;

    if (pageIds.length === 0) return { items: [], nextCursor };

    const users = await prisma.user.findMany({ where: { id: { in: pageIds } } });
    const usersById = new Map(users.map((user) => [user.id, user]));
    const items = pageIds
      .map((id) => usersById.get(id))
      .filter((user): user is UserRecord => Boolean(user));

    return { items, nextCursor };
  },
};
