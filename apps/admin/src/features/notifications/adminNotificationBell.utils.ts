import type { Notification } from "@outfiqe/types";

const ADMIN_BASE_PATH = "/admin";

export const toSameOriginAdminHref = (targetUrl: string, currentOrigin: string): string | null => {
  const target = new URL(targetUrl);
  if (target.origin !== currentOrigin) return null;
  if (target.pathname !== ADMIN_BASE_PATH && !target.pathname.startsWith(`${ADMIN_BASE_PATH}/`)) {
    return null;
  }

  const pathWithinAdmin = target.pathname.slice(ADMIN_BASE_PATH.length) || "/";
  return `${pathWithinAdmin}${target.search}${target.hash}`;
};

export const belongsToTenant =
  (tenantOrganizationId: string | undefined) =>
  (notification: Notification): boolean =>
    tenantOrganizationId !== undefined && notification.organizationId === tenantOrganizationId;
