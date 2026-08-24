"use client";

import type { Notification } from "@outfiqe/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { EventSocket } from "./socketEventAdapter";
import { toEventSocket } from "./socketEventAdapter";
import { NOTIFICATIONS_QUERY_KEY, NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY } from "./useNotifications";

export type NotificationSocket = EventSocket;
export const toNotificationSocket = toEventSocket;

const NOTIFICATION_SOCKET_EVENTS = {
  CREATED: "notification:created",
  UPDATED: "notification:updated",
  READ: "notification:read",
  READ_ALL: "notification:read-all",
} as const;

type NotificationPageData = { notifications: Notification[]; nextCursor: string | null };
type InfiniteNotificationsData = {
  pages: NotificationPageData[];
  pageParams: (string | undefined)[];
};

export const useNotificationSocket = (socket: NotificationSocket | null | undefined): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleCreated = (notification: Notification): void => {
      queryClient.setQueryData<InfiniteNotificationsData>(NOTIFICATIONS_QUERY_KEY, (data) => {
        if (!data) return data;
        const firstPage = data.pages[0];
        if (!firstPage) return data;
        const alreadyPresent = data.pages.some((page) =>
          page.notifications.some((existing) => existing.id === notification.id),
        );
        if (alreadyPresent) return data;

        return {
          ...data,
          pages: [
            { ...firstPage, notifications: [notification, ...firstPage.notifications] },
            ...data.pages.slice(1),
          ],
        };
      });

      if (!notification.isRead) {
        queryClient.setQueryData<number>(
          NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
          (count) => (count ?? 0) + 1,
        );
      }
    };

    const handleUpdated = (notification: Notification): void => {
      queryClient.setQueryData<InfiniteNotificationsData>(NOTIFICATIONS_QUERY_KEY, (data) => {
        if (!data) return data;

        let matched = false;
        const withoutStaleCard = data.pages.map((page) => ({
          ...page,
          notifications: page.notifications.filter((existing) => {
            if (existing.id !== notification.id) return true;
            matched = true;
            return false;
          }),
        }));
        if (!matched) return data;

        const firstPage = withoutStaleCard[0];
        if (!firstPage) return data;

        return {
          ...data,
          pages: [
            { ...firstPage, notifications: [notification, ...firstPage.notifications] },
            ...withoutStaleCard.slice(1),
          ],
        };
      });
    };

    const handleRead = ({ id }: { id: string }): void => {
      let wasUnread = false;
      queryClient.setQueryData<InfiniteNotificationsData>(NOTIFICATIONS_QUERY_KEY, (data) => {
        if (!data) return data;
        const readAt = new Date().toISOString();
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((existing) => {
              if (existing.id !== id || existing.isRead) return existing;
              wasUnread = true;
              return { ...existing, isRead: true, readAt };
            }),
          })),
        };
      });
      if (wasUnread) {
        queryClient.setQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, (count) =>
          count && count > 0 ? count - 1 : 0,
        );
      }
    };

    const handleReadAll = ({ readAt }: { readAt: string }): void => {
      queryClient.setQueryData<InfiniteNotificationsData>(NOTIFICATIONS_QUERY_KEY, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((existing) =>
              existing.isRead ? existing : { ...existing, isRead: true, readAt },
            ),
          })),
        };
      });
      queryClient.setQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, 0);
    };

    const reconcileUnreadCount = (): void => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY });
    };

    socket.on(NOTIFICATION_SOCKET_EVENTS.CREATED, handleCreated);
    socket.on(NOTIFICATION_SOCKET_EVENTS.UPDATED, handleUpdated);
    socket.on(NOTIFICATION_SOCKET_EVENTS.READ, handleRead);
    socket.on(NOTIFICATION_SOCKET_EVENTS.READ_ALL, handleReadAll);
    socket.on("connect", reconcileUnreadCount);

    return () => {
      socket.off(NOTIFICATION_SOCKET_EVENTS.CREATED, handleCreated);
      socket.off(NOTIFICATION_SOCKET_EVENTS.UPDATED, handleUpdated);
      socket.off(NOTIFICATION_SOCKET_EVENTS.READ, handleRead);
      socket.off(NOTIFICATION_SOCKET_EVENTS.READ_ALL, handleReadAll);
      socket.off("connect", reconcileUnreadCount);
    };
  }, [socket, queryClient]);
};
