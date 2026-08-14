import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { FollowTargetType } from "#generated/prisma/enums.js";
import type { UserRecord } from "#modules/users/user.types.js";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const SUGGESTED_LIMIT = 10;

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

  async suggestedCreators(userId: string): Promise<UserRecord[]> {
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
    return ranked
      .map((row) => byId.get(row.id))
      .filter((user): user is UserRecord => Boolean(user));
  },
};
