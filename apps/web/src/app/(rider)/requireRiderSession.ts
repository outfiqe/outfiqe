import "server-only";

import { redirect } from "next/navigation";

import type { ServerSession } from "@/features/auth/api/serverAuth";
import { UserRole } from "@/features/auth/types";
import { getDefaultRouteForUser } from "@/features/auth/utils/getDefaultRoute";

import { requireAuthedSession } from "../(dashboard)/requireDashboardSession";

export const requireRiderSession = async (currentPath: string): Promise<ServerSession> => {
  const session = await requireAuthedSession(currentPath);
  if (session.user.role !== UserRole.RIDER) redirect(getDefaultRouteForUser(session.user));
  return session;
};
