import { UserRole, type UserSession } from "../types";

export function getDefaultRouteForUser(user: Pick<UserSession, "role">): string {
  return user.role === UserRole.BRAND_OWNER ? "/dashboard" : "/";
}
