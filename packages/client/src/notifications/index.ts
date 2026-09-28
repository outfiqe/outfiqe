import type {
  Notification,
  NotificationChannelChanges,
  NotificationFeedScope,
  NotificationPage,
  NotificationPreference,
  NotificationType,
} from "@outfiqe/types";

import type { ApiClient } from "../client";

type NotificationsApiOptions = {
  scope?: NotificationFeedScope;
};

export const createNotificationsApi = (
  client: ApiClient,
  { scope }: NotificationsApiOptions = {},
) => {
  const scopeParams = scope ? { scope } : {};

  return {
    list: async (params: { cursor?: string; limit?: number } = {}): Promise<NotificationPage> => {
      const res = await client.get<NotificationPage>("/notifications", {
        params: { ...params, ...scopeParams },
      });
      return res.data;
    },

    unreadCount: async (): Promise<number> => {
      const res = await client.get<{ count: number }>("/notifications/unread-count", {
        params: scopeParams,
      });
      return res.data.count;
    },

    markRead: async (id: string): Promise<void> => {
      await client.patch<Notification>(`/notifications/${id}/read`);
    },

    markAllRead: async (): Promise<void> => {
      await client.patch<Record<string, never>>("/notifications/read-all", undefined, {
        params: scopeParams,
      });
    },

    listPreferences: async (): Promise<NotificationPreference[]> => {
      const res = await client.get<{ preferences: NotificationPreference[] }>(
        "/notifications/preferences",
      );
      return res.data.preferences;
    },

    setPreference: async (
      type: NotificationType,
      changes: NotificationChannelChanges,
    ): Promise<void> => {
      await client.patch<NotificationPreference>(`/notifications/preferences/${type}`, changes);
    },
  };
};

export type NotificationsApi = ReturnType<typeof createNotificationsApi>;
