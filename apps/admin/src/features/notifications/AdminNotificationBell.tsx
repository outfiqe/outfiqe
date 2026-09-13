import { NotificationBell } from "@outfiqe/components";
import { type NotificationSocket, toNotificationSocket } from "@outfiqe/hooks";
import { type Notification, NotificationSurface, NotificationType } from "@outfiqe/types";
import { isExternalNotificationPath } from "@outfiqe/utils";
import { useNavigate } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import { notificationsApi } from "@/lib/notificationsApi";
import { acquireSocketConnection, getSocket, releaseSocketConnection } from "@/lib/socketClient";

import { resolveNotificationHref } from "./resolveNotificationHref";

const WEB_URL = import.meta.env.VITE_WEB_URL ?? "http://localhost:3000";

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

  const handleSelect = (notification: Notification): void => {
    if (isExpiredAnnouncement(notification)) return;

    if (isExternalNotificationPath(notification.targetPath)) {
      window.open(notification.targetPath as string, "_blank", "noopener,noreferrer");
      return;
    }

    if (notification.targetPath) {
      if (notification.targetSurface === NotificationSurface.ADMIN) {
        void navigate({ href: notification.targetPath });
      } else {
        window.location.assign(`${WEB_URL}${notification.targetPath}`);
      }
      return;
    }
    const legacyTarget = resolveNotificationHref(notification);
    if (legacyTarget) void navigate(legacyTarget);
  };

  return (
    <NotificationBell notificationsApi={notificationsApi} socket={socket} onSelect={handleSelect} />
  );
};
