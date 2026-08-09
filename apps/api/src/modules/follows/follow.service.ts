import { followRepository } from "./follow.repository.js";
import { userRepository } from "../users/user.repository.js";
import { brandRepository } from "../brands/brand.repository.js";

import { AppError } from "../../shared/middlewares/error-handler.js";
import { DomainEvents, eventBus } from "../../shared/events/event-bus.js";
import { FollowTargetType } from "../../generated/prisma/enums.js";

import type { FollowTargetTypeParam } from "./follow.schemas.js";
import type { FollowResult, FollowTarget } from "./follow.types.js";
import type { UserRecord } from "../users/user.types.js";

const BAD_REQUEST_STATUS = 400;
const NOT_FOUND_STATUS = 404;

const toPrismaTargetType = (param: FollowTargetTypeParam): FollowTargetType =>
  param === "user" ? FollowTargetType.USER : FollowTargetType.BRAND;

const toFollowTarget = (user: UserRecord): FollowTarget => ({
  kind: "user",
  id: user.id,
  name: user.name,
  handle: user.handle,
  isCreator: user.isCreator,
  creatorStatus: user.creatorStatus,
  followerCount: user.followerCount,
});

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

    const result = await followRepository.follow(followerId, targetType, targetId);
    if (result.created) {
      const event =
        targetType === FollowTargetType.USER
          ? DomainEvents.USER_FOLLOWED
          : DomainEvents.BRAND_FOLLOWED;
      eventBus.emit(event, { followerId, followingId: targetId });
    }

    return { following: true, followerCount: result.followerCount };
  },

  async unfollow(
    followerId: string,
    targetTypeParam: FollowTargetTypeParam,
    targetId: string,
  ): Promise<FollowResult> {
    const targetType = toPrismaTargetType(targetTypeParam);
    await requireTarget(targetType, targetId);

    const result = await followRepository.unfollow(followerId, targetType, targetId);
    if (result.deleted) {
      const event =
        targetType === FollowTargetType.USER
          ? DomainEvents.USER_UNFOLLOWED
          : DomainEvents.BRAND_UNFOLLOWED;
      eventBus.emit(event, { followerId, followingId: targetId });
    }

    return { following: false, followerCount: result.followerCount };
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
};
