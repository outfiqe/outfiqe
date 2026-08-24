"use client";

import type { ConversationsApi } from "@outfiqe/client";

import { useInfiniteCursorPage } from "./useInfiniteCursorPage";

export const CONVERSATIONS_QUERY_KEY = ["conversations"] as const;

export const useConversations = (conversationsApi: ConversationsApi, enabled = true) => {
  return useInfiniteCursorPage(
    CONVERSATIONS_QUERY_KEY,
    (cursor) => conversationsApi.listConversations({ cursor }),
    enabled,
  );
};
