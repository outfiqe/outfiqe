"use client";

import type { ChatApi } from "@outfiqe/client";
import { useQuery } from "@tanstack/react-query";

const MIN_CONTACT_QUERY_LENGTH = 1;

export const useChatContactSearch = (chatApi: ChatApi, query: string) => {
  const trimmedQuery = query.trim();

  return useQuery({
    queryKey: ["chat", "contacts", "search", trimmedQuery],
    queryFn: () => chatApi.searchContacts(trimmedQuery),
    enabled: trimmedQuery.length >= MIN_CONTACT_QUERY_LENGTH,
  });
};
