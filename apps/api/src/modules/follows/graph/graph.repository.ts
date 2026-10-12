import { prisma } from "#db/prisma.js";
import type { FollowTargetType } from "#generated/prisma/enums.js";
import type { UserRecord } from "#modules/users/user.types.js";

import { FOLLOWING_SCAN_CAP } from "../suggestions/suggestion.repository.js";

export const followGraphRepository = {
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
};
