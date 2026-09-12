import type { PublicUser, UserRecord } from "./user.types.js";

export const toPublicUser = (user: UserRecord): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  handle: user.handle,
  avatarUrl: user.avatarUrl,
  role: user.role,
  isCreator: user.isCreator,
  creatorStatus: user.creatorStatus,
  emailVerified: user.emailVerified,
  accountStatus: user.accountStatus,
  suspendedAt: user.suspendedAt ? user.suspendedAt.toISOString() : null,
  suspendedBy: user.suspendedBy,
  suspensionReason: user.suspensionReason,
  suspensionExpiresAt: user.suspensionExpiresAt ? user.suspensionExpiresAt.toISOString() : null,
  createdAt: user.createdAt.toISOString(),
});
