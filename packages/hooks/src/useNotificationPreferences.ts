"use client";

import type { NotificationsApi } from "@outfiqe/client";
import type { NotificationPreference, NotificationType } from "@outfiqe/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const NOTIFICATION_PREFERENCES_QUERY_KEY = ["notifications", "preferences"] as const;

export const useNotificationPreferences = (notificationsApi: NotificationsApi, enabled = true) => {
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
    queryFn: () => notificationsApi.listPreferences(),
    enabled,
  });

  const setPreferenceMutation = useMutation({
    mutationFn: ({ type, enabled: nextEnabled }: { type: NotificationType; enabled: boolean }) =>
      notificationsApi.setPreference(type, nextEnabled),
    onMutate: ({ type, enabled: nextEnabled }) => {
      queryClient.setQueryData<NotificationPreference[]>(
        NOTIFICATION_PREFERENCES_QUERY_KEY,
        (data) =>
          data?.map((preference) =>
            preference.type === type ? { ...preference, enabled: nextEnabled } : preference,
          ),
      );
    },
  });

  return {
    preferences: preferencesQuery.data ?? [],
    isLoading: preferencesQuery.isLoading,
    setPreference: (type: NotificationType, enabled: boolean) =>
      setPreferenceMutation.mutate({ type, enabled }),
  };
};
