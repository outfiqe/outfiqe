"use client";

import type { ConversationsApi } from "@outfiqe/client";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { useInfiniteCursorPage } from "./useInfiniteCursorPage";

export const CONVERSATIONS_QUERY_KEY = ["conversations"] as const;

const isConversationsListQueryKey = (queryKey: QueryKey): boolean => {
  if (queryKey[0] !== CONVERSATIONS_QUERY_KEY[0]) return false;
  if (queryKey.length === 1) return true;
  const [, second] = queryKey;
  return queryKey.length === 2 && typeof second === "object" && second !== null;
};

export const invalidateConversationsList = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: (query) => isConversationsListQueryKey(query.queryKey),
  });

export const useConversations = (conversationsApi: ConversationsApi, enabled = true, q = "") => {
  const trimmedQuery = q.trim();
  return useInfiniteCursorPage(
    trimmedQuery ? [...CONVERSATIONS_QUERY_KEY, { q: trimmedQuery }] : CONVERSATIONS_QUERY_KEY,
    (cursor) => conversationsApi.listConversations({ cursor, q: trimmedQuery || undefined }),
    enabled,
  );
};
