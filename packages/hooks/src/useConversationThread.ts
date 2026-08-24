"use client";

import type { ConversationsApi } from "@outfiqe/client";

import { useInfiniteCursorPage } from "./useInfiniteCursorPage";

export const conversationMessagesQueryKey = (conversationId: string) =>
  ["conversations", conversationId, "messages"] as const;

export const useConversationThread = (
  conversationsApi: ConversationsApi,
  conversationId: string,
  enabled = true,
) => {
  return useInfiniteCursorPage(
    conversationMessagesQueryKey(conversationId),
    (cursor) => conversationsApi.listMessages(conversationId, { cursor }),
    enabled,
  );
};
