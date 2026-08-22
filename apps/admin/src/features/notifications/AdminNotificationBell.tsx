import { NotificationBell } from "@outfiqe/components";
import { type NotificationSocket, toNotificationSocket } from "@outfiqe/hooks";
import type { Notification } from "@outfiqe/types";
import { useNavigate } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import { notificationsApi } from "@/lib/notificationsApi";
import { acquireSocketConnection, getSocket, releaseSocketConnection } from "@/lib/socketClient";

import { resolveNotificationHref } from "./resolveNotificationHref";

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
    const href = resolveNotificationHref(notification);
    if (href) void navigate({ to: href });
  };

  return (
    <NotificationBell notificationsApi={notificationsApi} socket={socket} onSelect={handleSelect} />
  );
};
