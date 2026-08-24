"use client";

import type { ChatApi } from "@outfiqe/client";
import type { ChatSettings } from "@outfiqe/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const CHAT_SETTINGS_QUERY_KEY = ["chat", "settings"] as const;

export const useChatSettings = (chatApi: ChatApi, enabled = true) => {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: CHAT_SETTINGS_QUERY_KEY,
    queryFn: () => chatApi.getSettings(),
    enabled,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (isChatEnabled: boolean) => chatApi.updateSettings(isChatEnabled),
    onMutate: (isChatEnabled) => {
      const previous = queryClient.getQueryData<ChatSettings>(CHAT_SETTINGS_QUERY_KEY);
      queryClient.setQueryData<ChatSettings>(CHAT_SETTINGS_QUERY_KEY, { isChatEnabled });
      return { previous };
    },
    onError: (_error, _isChatEnabled, context) => {
      if (context?.previous) {
        queryClient.setQueryData<ChatSettings>(CHAT_SETTINGS_QUERY_KEY, context.previous);
      }
    },
  });

  return {
    isChatEnabled: settingsQuery.data?.isChatEnabled ?? true,
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    refetch: settingsQuery.refetch,
    setChatEnabled: updateSettingsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending,
  };
};
