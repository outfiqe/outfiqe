import type { UserRecord } from "#modules/users/user.types.js";

import type { CreatorProfile, CreatorSearchResult } from "./creator.types.js";

export const toProfile = (user: UserRecord): CreatorProfile => ({
  userId: user.id,
  name: user.name,
  email: user.email,
  handle: user.handle,
  avatarUrl: user.avatarUrl,
  heightCm: user.heightCm,
  showHeight: user.showHeight,
  hideFromLeaderboards: user.hideFromLeaderboards,
  isCreator: user.isCreator,
  creatorStatus: user.creatorStatus,
});

export const toSearchResult = (user: UserRecord): CreatorSearchResult => ({
  userId: user.id,
  name: user.name,
  handle: user.handle,
  avatarUrl: user.avatarUrl,
  followerCount: user.followerCount,
});
