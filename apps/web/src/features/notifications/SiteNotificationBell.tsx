"use client";

import { NotificationBell } from "@outfiqe/components";
import { type NotificationSocket, toNotificationSocket } from "@outfiqe/hooks";
import type { Notification } from "@outfiqe/types";
import { useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";

import { useAuth } from "@/features/auth";
import { notificationsApi } from "@/shared/lib/notificationsApi";
import {
  acquireSocketConnection,
  getSocket,
  releaseSocketConnection,
} from "@/shared/lib/socketClient";

import { resolveNotificationHref } from "./resolveNotificationHref";

const getSocketSnapshot = (): NotificationSocket => toNotificationSocket(getSocket());
const getServerSocketSnapshot = (): null => null;

export const SiteNotificationBell = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const subscribeToSocket = useCallback(
    (_onStoreChange: () => void): (() => void) => {
      if (!isAuthenticated) return () => {};
      acquireSocketConnection();
      return () => releaseSocketConnection();
    },
    [isAuthenticated],
  );

  const socket = useSyncExternalStore(
    subscribeToSocket,
    getSocketSnapshot,
    getServerSocketSnapshot,
  );

  if (!isAuthenticated) return null;

  const handleSelect = (notification: Notification): void => {
    const href = resolveNotificationHref(notification);
    if (href) router.push(href);
  };

  return (
    <NotificationBell notificationsApi={notificationsApi} socket={socket} onSelect={handleSelect} />
  );
};
