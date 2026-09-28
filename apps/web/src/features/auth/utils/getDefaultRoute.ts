import { isStaffUserRole } from "@outfiqe/utils";

import type { UserSession } from "../types";

export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin";

export const getDefaultRouteForUser = (user: Pick<UserSession, "role">): string => {
  return isStaffUserRole(user.role) ? ADMIN_URL : "/overview";
};
