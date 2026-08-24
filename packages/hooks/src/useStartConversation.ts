"use client";

import type { ConversationsApi } from "@outfiqe/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateConversationsList } from "./useConversations";

export const useStartConversation = (conversationsApi: ConversationsApi) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => conversationsApi.startConversation(userId),
    onSuccess: () => {
      void invalidateConversationsList(queryClient);
    },
  });
};
