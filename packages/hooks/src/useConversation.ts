"use client";

import type { ConversationsApi } from "@outfiqe/client";
import { useQuery } from "@tanstack/react-query";

export const conversationQueryKey = (conversationId: string) =>
  ["conversations", conversationId] as const;

export const useConversation = (
  conversationsApi: ConversationsApi,
  conversationId: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: conversationQueryKey(conversationId),
    queryFn: () => conversationsApi.getConversation(conversationId),
    enabled,
  });
};
