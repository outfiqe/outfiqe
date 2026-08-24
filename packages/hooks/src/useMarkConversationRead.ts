"use client";

import type { ConversationsApi } from "@outfiqe/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateConversationsList } from "./useConversations";

export const useMarkConversationRead = (
  conversationsApi: ConversationsApi,
  conversationId: string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => conversationsApi.markConversationRead(conversationId),
    onSuccess: () => {
      void invalidateConversationsList(queryClient);
    },
  });
};
