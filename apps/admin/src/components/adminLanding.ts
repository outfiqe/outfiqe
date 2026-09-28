import type { AdminUser } from "@/features/auth/schemas";
import { canOpenPlatformOverview, PLATFORM_OVERVIEW_PATH } from "@/lib/platformPermissions";

import { PLATFORM_NAV_ITEMS } from "./AdminSidebar";
import {
  findFirstVisiblePlatformHref,
  findPlatformNavItemForPath,
  isPlatformNavItemVisible,
} from "./AdminSidebar.utils";

const CRM_HOME_PATH = "/crm";

export type AdminLanding =
  { kind: "route"; href: string } | { kind: "tenant"; subdomain: string } | { kind: "no-sections" };

export type PlatformPathAccess = "not-platform" | "allowed" | "denied";

const toNavViewer = (user: AdminUser) => ({
  isCoFounder: user.isCoFounder,
  hiddenNavKeys: user.hiddenPlatformNavKeys,
});

export const resolveAdminLanding = (user: AdminUser, isOnTenantHost: boolean): AdminLanding => {
  if (isOnTenantHost) return { kind: "route", href: CRM_HOME_PATH };

  if (user.hasPlatformAccess) {
    if (canOpenPlatformOverview(user)) return { kind: "route", href: PLATFORM_OVERVIEW_PATH };
    const firstSectionHref = findFirstVisiblePlatformHref(PLATFORM_NAV_ITEMS, toNavViewer(user));
    return firstSectionHref ? { kind: "route", href: firstSectionHref } : { kind: "no-sections" };
  }

  if (user.crmHomeSubdomain) return { kind: "tenant", subdomain: user.crmHomeSubdomain };
  return { kind: "route", href: CRM_HOME_PATH };
};

export const resolvePlatformPathAccess = (
  user: AdminUser,
  pathname: string,
): PlatformPathAccess => {
  if (pathname === PLATFORM_OVERVIEW_PATH) {
    return canOpenPlatformOverview(user) ? "allowed" : "denied";
  }

  const navItem = findPlatformNavItemForPath(PLATFORM_NAV_ITEMS, pathname);
  if (!navItem) return "not-platform";

  const isAllowed = user.hasPlatformAccess && isPlatformNavItemVisible(navItem, toNavViewer(user));
  return isAllowed ? "allowed" : "denied";
};
