import { UserRole, type UserSession } from "../types";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173";

export const getDefaultRouteForUser = (user: Pick<UserSession, "role">): string => {
  return user.role === UserRole.ADMIN ? ADMIN_URL : "/dashboard";
};
