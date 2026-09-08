import "server-only";

import { redirect } from "next/navigation";

import { getServerSessionWithToken, type ServerSession } from "@/features/auth/api/serverAuth";
import { CreatorStatus, UserRole } from "@/features/auth/types";
import { ADMIN_URL } from "@/features/auth/utils/getDefaultRoute";

export const requireAuthedSession = async (currentPath: string): Promise<ServerSession> => {
  const session = await getServerSessionWithToken();
  if (!session) redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  return session;
};

const isApprovedCreator = (session: ServerSession): boolean =>
  session.user.isCreator && session.user.creatorStatus === CreatorStatus.APPROVED;

const isBrandMember = (session: ServerSession): boolean => session.user.brandId !== undefined;

const hasOwnDashboard = (session: ServerSession): boolean =>
  isApprovedCreator(session) || isBrandMember(session);

export const requireDashboardSession = async (currentPath: string): Promise<ServerSession> => {
  const session = await requireAuthedSession(currentPath);
  if (session.user.role === UserRole.ADMIN && !hasOwnDashboard(session)) redirect(ADMIN_URL);
  return session;
};
