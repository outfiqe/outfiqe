"use client";

import type { ConversationsApi } from "@outfiqe/client";
import type { Message, MessagesPage, NewMessageAttachmentInput } from "@outfiqe/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CONVERSATIONS_QUERY_KEY } from "./useConversations";
import { conversationMessagesQueryKey } from "./useConversationThread";

type InfiniteMessagesData = {
  pages: MessagesPage[];
  pageParams: (string | undefined)[];
};

const prependMessage = (
  data: InfiniteMessagesData | undefined,
  message: Message,
): InfiniteMessagesData => {
  if (!data) {
    return { pages: [{ items: [message], nextCursor: null }], pageParams: [undefined] };
  }
  const firstPage = data.pages[0];
  if (!firstPage) return data;
  if (firstPage.items.some((item) => item.id === message.id)) return data;

  return {
    ...data,
    pages: [{ ...firstPage, items: [message, ...firstPage.items] }, ...data.pages.slice(1)],
  };
};

export const useSendMessage = (conversationsApi: ConversationsApi, conversationId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { body?: string; attachments?: NewMessageAttachmentInput[] }) =>
      conversationsApi.sendMessage(conversationId, payload),
    onSuccess: (message) => {
      queryClient.setQueryData<InfiniteMessagesData>(
        conversationMessagesQueryKey(conversationId),
        (data) => prependMessage(data, message),
      );
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    },
  });
};
