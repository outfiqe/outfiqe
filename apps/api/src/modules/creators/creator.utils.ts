import type { UserRecord } from "#modules/users/user.types.js";

import type { CreatorProfile } from "./creator.types.js";

export const toProfile = (user: UserRecord): CreatorProfile => ({
  userId: user.id,
  name: user.name,
  email: user.email,
  handle: user.handle,
  avatarUrl: user.avatarUrl,
  isCreator: user.isCreator,
  creatorStatus: user.creatorStatus,
});
