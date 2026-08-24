"use client";

import type { ChatApi } from "@outfiqe/client";
import type { BlockedChatContact, ChatBlocksPage, ChatContact } from "@outfiqe/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useInfiniteCursorPage } from "./useInfiniteCursorPage";

export const CHAT_BLOCKS_QUERY_KEY = ["chat", "blocks"] as const;

type InfiniteChatBlocksData = {
  pages: ChatBlocksPage[];
  pageParams: (string | undefined)[];
};

const removeBlockedContact = (
  data: InfiniteChatBlocksData | undefined,
  contactId: string,
): InfiniteChatBlocksData | undefined => {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== contactId),
    })),
  };
};

export const useChatBlocks = (chatApi: ChatApi, enabled = true) => {
  const queryClient = useQueryClient();

  const blocksQuery = useInfiniteCursorPage(
    CHAT_BLOCKS_QUERY_KEY,
    (cursor) => chatApi.listBlocks({ cursor }),
    enabled,
  );

  const blockMutation = useMutation({
    mutationFn: (contact: ChatContact) => chatApi.blockUser(contact.id),
    onMutate: (contact) => {
      const optimisticEntry: BlockedChatContact = {
        ...contact,
        blockedAt: new Date().toISOString(),
      };
      queryClient.setQueryData<InfiniteChatBlocksData>(CHAT_BLOCKS_QUERY_KEY, (data) => {
        if (!data) return data;
        const firstPage = data.pages[0];
        if (!firstPage) return data;
        return {
          ...data,
          pages: [
            { ...firstPage, items: [optimisticEntry, ...firstPage.items] },
            ...data.pages.slice(1),
          ],
        };
      });
    },
    onError: (_error, contact) => {
      queryClient.setQueryData<InfiniteChatBlocksData>(CHAT_BLOCKS_QUERY_KEY, (data) =>
        removeBlockedContact(data, contact.id),
      );
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (contactId: string) => chatApi.unblockUser(contactId),
    onMutate: (contactId) => {
      const previous = queryClient.getQueryData<InfiniteChatBlocksData>(CHAT_BLOCKS_QUERY_KEY);
      queryClient.setQueryData<InfiniteChatBlocksData>(CHAT_BLOCKS_QUERY_KEY, (data) =>
        removeBlockedContact(data, contactId),
      );
      return { previous };
    },
    onError: (_error, _contactId, context) => {
      if (context?.previous) {
        queryClient.setQueryData<InfiniteChatBlocksData>(CHAT_BLOCKS_QUERY_KEY, context.previous);
      }
    },
  });

  return {
    blocksQuery,
    blockUser: blockMutation.mutate,
    unblockUser: unblockMutation.mutate,
  };
};
