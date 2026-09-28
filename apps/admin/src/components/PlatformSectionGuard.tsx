import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { isOnTenantHost } from "@/lib/tenantHost";

import { resolveAdminLanding, resolvePlatformPathAccess } from "./adminLanding";
import { NoSectionAccess } from "./NoSectionAccess";

export const PlatformSectionGuard = ({ children }: { children: ReactNode }) => {
  const { state } = useAuth();
  const pathname = useRouterState({ select: (routerState) => routerState.location.pathname });

  if (state.status !== "signed-in") return <>{children}</>;

  const { user } = state;
  if (resolvePlatformPathAccess(user, pathname) !== "denied") return <>{children}</>;

  const landing = resolveAdminLanding(user, isOnTenantHost());
  const homeHref = landing.kind === "route" && landing.href !== pathname ? landing.href : null;
  return <NoSectionAccess homeHref={homeHref} />;
};
