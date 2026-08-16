import { FollowTargetType } from "#generated/prisma/enums.js";
import type { UserRecord } from "#modules/users/user.types.js";

import type { FollowTargetTypeParam } from "./follow.schemas.js";
import type { FollowerView, FollowTarget } from "./follow.types.js";

export const toPrismaTargetType = (param: FollowTargetTypeParam): FollowTargetType =>
  param === "user" ? FollowTargetType.USER : FollowTargetType.BRAND;

export const toFollowTarget = (user: UserRecord): FollowTarget => ({
  kind: "user",
  id: user.id,
  name: user.name,
  handle: user.handle,
  isCreator: user.isCreator,
  creatorStatus: user.creatorStatus,
  followerCount: user.followerCount,
});

export const toFollowerView = (user: UserRecord, isFollowedByViewer: boolean): FollowerView => ({
  id: user.id,
  name: user.name,
  handle: user.handle,
  isCreator: user.isCreator,
  isFollowedByViewer,
});
