import { NotificationBell } from "@outfiqe/components";
import { type NotificationSocket, toNotificationSocket } from "@outfiqe/hooks";
import { type Notification, NotificationSurface, NotificationType } from "@outfiqe/types";
import { isExternalNotificationPath } from "@outfiqe/utils";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useSyncExternalStore } from "react";

import { crmApi } from "@/features/crm/api";
import { notificationsApi } from "@/lib/notificationsApi";
import { acquireSocketConnection, getSocket, releaseSocketConnection } from "@/lib/socketClient";
import { isOnTenantHost } from "@/lib/tenantHost";

import { belongsToTenant, toSameOriginAdminHref } from "./adminNotificationBell.utils";
import { resolveNotificationHref } from "./resolveNotificationHref";

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";
const CRM_ORGANIZATION_STALE_TIME_MS = 5 * 60 * 1000;

const isExpiredAnnouncement = (notification: Notification): boolean => {
  if (notification.type !== NotificationType.ANNOUNCEMENT) return false;
  const expiresAt = notification.metadata.announcementExpiresAt;
  return Boolean(expiresAt && new Date(expiresAt) <= new Date());
};

const subscribeToSocket = (_onStoreChange: () => void): (() => void) => {
  acquireSocketConnection();
  return () => releaseSocketConnection();
};

const getSocketSnapshot = (): NotificationSocket => toNotificationSocket(getSocket());
const getServerSocketSnapshot = (): null => null;

export const AdminNotificationBell = () => {
  const navigate = useNavigate();
  const socket = useSyncExternalStore(
    subscribeToSocket,
    getSocketSnapshot,
    getServerSocketSnapshot,
  );

  const isTenantBell = isOnTenantHost();
  const { data: tenantOrganization } = useQuery({
    queryKey: ["crm-organization"],
    queryFn: crmApi.getOrganization,
    retry: false,
    staleTime: CRM_ORGANIZATION_STALE_TIME_MS,
    enabled: isTenantBell,
  });
  const tenantOrganizationId = tenantOrganization?.id;
  const acceptsNotification = useMemo(
    () => (isTenantBell ? belongsToTenant(tenantOrganizationId) : undefined),
    [isTenantBell, tenantOrganizationId],
  );

  const openExternalTarget = (targetUrl: string): void => {
    const inAppHref = toSameOriginAdminHref(targetUrl, window.location.origin);
    if (inAppHref) {
      void navigate({ href: inAppHref });
      return;
    }
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handleSelect = (notification: Notification): void => {
    if (isExpiredAnnouncement(notification)) return;

    const { targetPath, targetSurface } = notification;
    if (targetPath && isExternalNotificationPath(targetPath)) {
      openExternalTarget(targetPath);
      return;
    }

    if (targetPath) {
      if (targetSurface === NotificationSurface.ADMIN) {
        void navigate({ href: targetPath });
      } else {
        window.location.assign(`${WEB_URL}${targetPath}`);
      }
      return;
    }
    const legacyTarget = resolveNotificationHref(notification);
    if (legacyTarget) void navigate(legacyTarget);
  };

  return (
    <NotificationBell
      notificationsApi={notificationsApi}
      socket={socket}
      onSelect={handleSelect}
      acceptsNotification={acceptsNotification}
    />
  );
};
