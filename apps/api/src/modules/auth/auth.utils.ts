import type { UserRecord } from "#modules/users/user.types.js";

import type { AuthUser } from "./auth.types.js";

export const toAuthUser = (user: UserRecord): AuthUser => {
  const {
    id,
    name,
    handle,
    email,
    phone,
    avatarUrl,
    role,
    isCreator,
    creatorStatus,
    passwordHash,
  } = user;
  return {
    id,
    name,
    handle,
    email,
    phone,
    avatarUrl,
    role,
    isCreator,
    creatorStatus,
    hasPassword: passwordHash !== null,
  };
};
