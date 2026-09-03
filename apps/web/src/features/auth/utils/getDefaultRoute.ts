import { UserRole, type UserSession } from "../types";

export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin";

export const getDefaultRouteForUser = (user: Pick<UserSession, "role">): string => {
  return user.role === UserRole.ADMIN ? ADMIN_URL : "/overview";
};
