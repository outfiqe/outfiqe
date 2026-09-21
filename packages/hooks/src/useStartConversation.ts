"use client";

import type { ConversationsApi } from "@outfiqe/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { conversationQueryKey } from "./useConversation";
import { invalidateConversationsList } from "./useConversations";

export const useStartConversation = (conversationsApi: ConversationsApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => conversationsApi.startConversation(userId),
    onSuccess: (conversation) => {
      queryClient.setQueryData(conversationQueryKey(conversation.id), conversation);
      void invalidateConversationsList(queryClient);
    },
  });
};
