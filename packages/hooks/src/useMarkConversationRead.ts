"use client";

import type { ConversationsApi } from "@outfiqe/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CONVERSATIONS_QUERY_KEY } from "./useConversations";

export const useMarkConversationRead = (
  conversationsApi: ConversationsApi,
  conversationId: string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => conversationsApi.markConversationRead(conversationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY, exact: true });
    },
  });
};
