import { DomainEvents, eventBus } from "#events/event-bus.js";
import { FollowTargetType } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { userRepository } from "#modules/users/user.repository.js";

import { followRepository } from "./follow.repository.js";
import type { FollowTargetTypeParam, ListFollowersQuery } from "./follow.schemas.js";
import type { FollowersPage, FollowingPage, FollowResult, FollowTarget } from "./follow.types.js";
import {
  toBrandFollowTarget,
  toFollowerView,
  toFollowTarget,
  toPrismaTargetType,
} from "./follow.utils.js";

const BAD_REQUEST_STATUS = 400;
const NOT_FOUND_STATUS = 404;

const requireTarget = async (targetType: FollowTargetType, targetId: string): Promise<void> => {
  const exists =
    targetType === FollowTargetType.USER
      ? await userRepository.findById(targetId)
      : await brandRepository.findById(targetId);
  if (!exists) {
    const label = targetType === FollowTargetType.USER ? "User" : "Brand";
    throw new AppError("NOT_FOUND", `${label} not found.`, NOT_FOUND_STATUS);
  }
};

export const followService = {
  async follow(
    followerId: string,
    targetTypeParam: FollowTargetTypeParam,
    targetId: string,
  ): Promise<FollowResult> {
    const targetType = toPrismaTargetType(targetTypeParam);
    if (targetType === FollowTargetType.USER && followerId === targetId) {
      throw new AppError("CANNOT_SELF_FOLLOW", "You can't follow yourself.", BAD_REQUEST_STATUS);
    }

    await requireTarget(targetType, targetId);

    const { created, followerCount } = await followRepository.follow(
      followerId,
      targetType,
      targetId,
    );
    if (created) {
      const event =
        targetType === FollowTargetType.USER
          ? DomainEvents.USER_FOLLOWED
          : DomainEvents.BRAND_FOLLOWED;
      await eventBus.publish(event, { followerId, followingId: targetId });
    }

    return { following: true, followerCount };
  },

  async unfollow(
    followerId: string,
    targetTypeParam: FollowTargetTypeParam,
    targetId: string,
  ): Promise<FollowResult> {
    const targetType = toPrismaTargetType(targetTypeParam);
    await requireTarget(targetType, targetId);

    const { deleted, followerCount } = await followRepository.unfollow(
      followerId,
      targetType,
      targetId,
    );
    if (deleted) {
      const event =
        targetType === FollowTargetType.USER
          ? DomainEvents.USER_UNFOLLOWED
          : DomainEvents.BRAND_UNFOLLOWED;
      await eventBus.publish(event, { followerId, followingId: targetId });
    }

    return { following: false, followerCount };
  },

  async isFollowing(
    followerId: string,
    targetTypeParam: FollowTargetTypeParam,
    targetId: string,
  ): Promise<boolean> {
    return followRepository.isFollowing(followerId, toPrismaTargetType(targetTypeParam), targetId);
  },

  async suggestedCreators(userId: string): Promise<FollowTarget[]> {
    const users = await followRepository.suggestedCreators(userId);
    return users.map(toFollowTarget);
  },

  async listFollowers(
    targetTypeParam: FollowTargetTypeParam,
    targetId: string,
    viewerId: string | undefined,
    query: ListFollowersQuery,
  ): Promise<FollowersPage> {
    const targetType = toPrismaTargetType(targetTypeParam);
    await requireTarget(targetType, targetId);

    const rows = await followRepository.listFollowers(targetType, targetId, query);
    const { items: pagedRows, nextCursor } = buildCursorPage(
      rows,
      query.limit,
      (row) => row.followerId,
    );

    const followedIds = viewerId
      ? await followRepository.findFollowedAmong(
          viewerId,
          FollowTargetType.USER,
          pagedRows.map((row) => row.follower.id),
        )
      : new Set<string>();

    return {
      items: pagedRows.map((row) => toFollowerView(row.follower, followedIds.has(row.follower.id))),
      nextCursor,
    };
  },

  async listFollowing(userId: string, query: ListFollowersQuery): Promise<FollowingPage> {
    const rows = await followRepository.listFollowingRows(userId);
    const userIds = rows
      .filter((row) => row.followingType === FollowTargetType.USER)
      .map((row) => row.followingId);
    const brandIds = rows
      .filter((row) => row.followingType === FollowTargetType.BRAND)
      .map((row) => row.followingId);

    const [followedUsers, followedBrands] = await Promise.all([
      userRepository.findManyByIds(userIds, query.q),
      brandRepository.findManyByIds(brandIds, query.q),
    ]);
    const usersById = new Map(followedUsers.map((user) => [user.id, user]));
    const brandsById = new Map(followedBrands.map((brand) => [brand.id, brand]));

    // Reassembled in application code rather than one query: Follow has no relation for
    // the polymorphic "following" side (User or Brand), so there's no single join to
    // express this in Prisma/SQL. The search filter itself still runs at the DB level,
    // in the two findManyByIds calls above.
    const targets: FollowTarget[] = [];
    for (const row of rows) {
      if (row.followingType === FollowTargetType.USER) {
        const user = usersById.get(row.followingId);
        if (user) targets.push(toFollowTarget(user));
      } else {
        const brand = brandsById.get(row.followingId);
        if (brand) targets.push(toBrandFollowTarget(brand));
      }
    }

    const startIndex = query.cursor
      ? targets.findIndex((target) => target.id === query.cursor) + 1
      : 0;
    const page = targets.slice(startIndex, startIndex + query.limit);
    const hasMore = startIndex + query.limit < targets.length;

    return { items: page, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
  },
};
