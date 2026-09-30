"use client";

import type { ChatSystemEvent, Message, MessageKind, MessagesPage } from "@outfiqe/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { EventSocket } from "./socketEventAdapter";
import { conversationQueryKey } from "./useConversation";
import { invalidateConversationsList } from "./useConversations";
import { conversationMessagesQueryKey } from "./useConversationThread";
import { forgetConversation, groupMembersQueryKey } from "./useGroupChat";

const CONVERSATION_SOCKET_EVENTS = {
  MESSAGE_CREATED: "message:created",
  CONVERSATION_UPDATED: "conversation:updated",
  CONVERSATION_REMOVED: "conversation:removed",
} as const;

const SYSTEM_MESSAGE_KIND: MessageKind = "SYSTEM";

type MessageAttachmentBroadcast = {
  id: string;
  url: string;
  mimeType: string;
  width: number | null;
  height: number | null;
};

type MessageBroadcast = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderHandle: string;
  senderAvatarUrl: string | null;
  kind: MessageKind;
  systemEvent: ChatSystemEvent | null;
  outfitId: string | null;
  body: string | null;
  attachments: MessageAttachmentBroadcast[];
  createdAt: string;
};

type ConversationRemovedBroadcast = { conversationId: string };

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
  kind: payload.kind,
  systemEvent: payload.systemEvent,
  outfitId: payload.outfitId ?? null,
  body: payload.body,
  attachments: payload.attachments,
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

      if (payload.kind === SYSTEM_MESSAGE_KIND) {
        void queryClient.invalidateQueries({
          queryKey: conversationQueryKey(payload.conversationId),
          exact: true,
        });
        void queryClient.invalidateQueries({
          queryKey: groupMembersQueryKey(payload.conversationId),
          exact: true,
        });
      }
    };

    const handleConversationUpdated = (): void => {
      void invalidateConversationsList(queryClient);
    };

    const handleConversationRemoved = ({ conversationId }: ConversationRemovedBroadcast): void => {
      forgetConversation(queryClient, conversationId);
    };

    socket.on(CONVERSATION_SOCKET_EVENTS.MESSAGE_CREATED, handleMessageCreated);
    socket.on(CONVERSATION_SOCKET_EVENTS.CONVERSATION_UPDATED, handleConversationUpdated);
    socket.on(CONVERSATION_SOCKET_EVENTS.CONVERSATION_REMOVED, handleConversationRemoved);

    return () => {
      socket.off(CONVERSATION_SOCKET_EVENTS.MESSAGE_CREATED, handleMessageCreated);
      socket.off(CONVERSATION_SOCKET_EVENTS.CONVERSATION_UPDATED, handleConversationUpdated);
      socket.off(CONVERSATION_SOCKET_EVENTS.CONVERSATION_REMOVED, handleConversationRemoved);
    };
  }, [socket, queryClient, currentUserId]);
};
