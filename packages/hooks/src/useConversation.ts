"use client";

import type { ConversationsApi } from "@outfiqe/client";
import type { ConversationPreview, ConversationsPage } from "@outfiqe/types";
import {
  type InfiniteData,
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { CONVERSATIONS_QUERY_KEY } from "./useConversations";

export const conversationQueryKey = (conversationId: string) =>
  ["conversations", conversationId] as const;

const findPreviewInCachedLists = (
  queryClient: QueryClient,
  conversationId: string,
): ConversationPreview | undefined => {
  const cachedQueries = queryClient.getQueriesData<InfiniteData<ConversationsPage>>({
    queryKey: CONVERSATIONS_QUERY_KEY,
  });

  for (const [, cachedList] of cachedQueries) {
    if (!Array.isArray(cachedList?.pages)) continue;

    for (const page of cachedList.pages) {
      const preview = page?.items?.find((item) => item.id === conversationId);
      if (preview) return preview;
    }
  }

  return undefined;
};

export const useConversation = (
  conversationsApi: ConversationsApi,
  conversationId: string,
  enabled = true,
) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: conversationQueryKey(conversationId),
    queryFn: () => conversationsApi.getConversation(conversationId),
    enabled,
    placeholderData: () => findPreviewInCachedLists(queryClient, conversationId),
  });
};
