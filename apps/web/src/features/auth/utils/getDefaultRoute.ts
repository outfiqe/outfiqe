import { isStaffUserRole } from "@outfiqe/utils";

import { UserRole, type UserSession } from "../types";

export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin";

export const RIDER_HOME_PATH = "/rider";

export const getDefaultRouteForUser = (user: Pick<UserSession, "role">): string => {
  if (isStaffUserRole(user.role)) return ADMIN_URL;
  if (user.role === UserRole.RIDER) return RIDER_HOME_PATH;
  return "/overview";
};
