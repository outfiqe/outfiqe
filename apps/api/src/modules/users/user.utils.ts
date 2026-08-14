import type { PublicUser, UserRecord } from "./user.types.js";

export const toPublicUser = (user: UserRecord): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  role: user.role,
  isCreator: user.isCreator,
  creatorStatus: user.creatorStatus,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt.toISOString(),
});
