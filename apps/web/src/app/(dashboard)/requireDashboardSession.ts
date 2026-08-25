import "server-only";

import { redirect } from "next/navigation";

import { getServerSessionWithToken, type ServerSession } from "@/features/auth/api/serverAuth";
import { UserRole } from "@/features/auth/types";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:5173";

export const requireDashboardSession = async (currentPath: string): Promise<ServerSession> => {
  const session = await getServerSessionWithToken();
  if (!session) redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  if (session.user.role === UserRole.ADMIN) redirect(ADMIN_URL);
  return session;
};
