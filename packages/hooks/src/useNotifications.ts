"use client";

import type { NotificationsApi } from "@outfiqe/client";
import type { NotificationPage } from "@outfiqe/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useInfiniteCursorPage } from "./useInfiniteCursorPage";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
export const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = ["notifications", "unread-count"] as const;

type InfiniteNotificationsData = {
  pages: NotificationPage[];
  pageParams: (string | undefined)[];
};

const markAllPagesRead = (
  data: InfiniteNotificationsData | undefined,
): InfiniteNotificationsData | undefined => {
  if (!data) return data;
  const readAt = new Date().toISOString();
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      notifications: page.notifications.map((notification) =>
        notification.isRead ? notification : { ...notification, isRead: true, readAt },
      ),
    })),
  };
};

const markOnePageRead = (
  data: InfiniteNotificationsData | undefined,
  notificationId: string,
): InfiniteNotificationsData | undefined => {
  if (!data) return data;
  const readAt = new Date().toISOString();
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      notifications: page.notifications.map((notification) =>
        notification.id === notificationId && !notification.isRead
          ? { ...notification, isRead: true, readAt }
          : notification,
      ),
    })),
  };
};

/**
 * Pagination (cursor-based, `useInfiniteCursorPage`) plus optimistic
 * mark-read/mark-all-read for the notification feed. Real-time updates come
 * from `useNotificationSocket`, which writes into the same query cache keys —
 * this hook owns fetching and mutating, not subscribing.
 */
export const useNotifications = (notificationsApi: NotificationsApi, enabled = true) => {
  const queryClient = useQueryClient();

  const feedQuery = useInfiniteCursorPage(
    NOTIFICATIONS_QUERY_KEY,
    (cursor) => notificationsApi.list({ cursor }),
    enabled,
  );

  const unreadCountQuery = useQuery({
    queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
    queryFn: () => notificationsApi.unreadCount(),
    enabled,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markRead(notificationId),
    onMutate: (notificationId) => {
      queryClient.setQueryData<InfiniteNotificationsData>(NOTIFICATIONS_QUERY_KEY, (data) =>
        markOnePageRead(data, notificationId),
      );
      queryClient.setQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, (count) =>
        count && count > 0 ? count - 1 : 0,
      );
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: () => {
      queryClient.setQueryData<InfiniteNotificationsData>(
        NOTIFICATIONS_QUERY_KEY,
        markAllPagesRead,
      );
      queryClient.setQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, 0);
    },
  });

  return {
    feedQuery,
    unreadCount: unreadCountQuery.data ?? 0,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  };
};
