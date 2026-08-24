"use client";

import type { Message, MessagesPage } from "@outfiqe/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { EventSocket } from "./socketEventAdapter";
import { invalidateConversationsList } from "./useConversations";
import { conversationMessagesQueryKey } from "./useConversationThread";

const CONVERSATION_SOCKET_EVENTS = {
  MESSAGE_CREATED: "message:created",
  CONVERSATION_UPDATED: "conversation:updated",
} as const;

type MessageBroadcast = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderHandle: string;
  senderAvatarUrl: string | null;
  body: string | null;
  hasAttachments: boolean;
  createdAt: string;
};

type InfiniteMessagesData = {
  pages: MessagesPage[];
  pageParams: (string | undefined)[];
};

const toBroadcastMessage = (
  payload: MessageBroadcast,
  currentUserId: string | undefined,
): Message => ({
  id: payload.id,
  conversationId: payload.conversationId,
  senderId: payload.senderId,
  sender: {
    id: payload.senderId,
    name: payload.senderName,
    handle: payload.senderHandle,
    avatarUrl: payload.senderAvatarUrl,
  },
  body: payload.body,
  attachments: [],
  createdAt: payload.createdAt,
  isMine: payload.senderId === currentUserId,
  isDeliveredToOthers: false,
  isReadByOthers: false,
});

export const useConversationSocket = (
  socket: EventSocket | null | undefined,
  currentUserId: string | undefined,
): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleMessageCreated = (payload: MessageBroadcast): void => {
      const message = toBroadcastMessage(payload, currentUserId);
      queryClient.setQueryData<InfiniteMessagesData>(
        conversationMessagesQueryKey(payload.conversationId),
        (data) => {
          if (!data) return data;
          const firstPage = data.pages[0];
          if (!firstPage) return data;
          if (firstPage.items.some((item) => item.id === message.id)) return data;
          return {
            ...data,
            pages: [{ ...firstPage, items: [message, ...firstPage.items] }, ...data.pages.slice(1)],
          };
        },
      );
    };

    const handleConversationUpdated = (): void => {
      void invalidateConversationsList(queryClient);
    };

    socket.on(CONVERSATION_SOCKET_EVENTS.MESSAGE_CREATED, handleMessageCreated);
    socket.on(CONVERSATION_SOCKET_EVENTS.CONVERSATION_UPDATED, handleConversationUpdated);

    return () => {
      socket.off(CONVERSATION_SOCKET_EVENTS.MESSAGE_CREATED, handleMessageCreated);
      socket.off(CONVERSATION_SOCKET_EVENTS.CONVERSATION_UPDATED, handleConversationUpdated);
    };
  }, [socket, queryClient, currentUserId]);
};
