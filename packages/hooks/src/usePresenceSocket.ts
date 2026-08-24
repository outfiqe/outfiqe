"use client";

import type { ConversationPreview } from "@outfiqe/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { EventSocket } from "./socketEventAdapter";
import { conversationQueryKey } from "./useConversation";
import { CONVERSATIONS_QUERY_KEY } from "./useConversations";

const PRESENCE_SOCKET_EVENT = "presence:changed";

type PresenceChangedPayload = {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
};

const patchOtherParticipant = (
  conversation: ConversationPreview | undefined,
  payload: PresenceChangedPayload,
): ConversationPreview | undefined => {
  if (!conversation || conversation.otherParticipant?.id !== payload.userId) return conversation;
  return {
    ...conversation,
    otherParticipant: {
      ...conversation.otherParticipant,
      isOnline: payload.isOnline,
      lastSeenAt: payload.lastSeenAt,
    },
  };
};

export const usePresenceSocket = (
  socket: EventSocket | null | undefined,
  conversationId: string | null,
): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handlePresenceChanged = (payload: PresenceChangedPayload): void => {
      if (conversationId) {
        queryClient.setQueryData<ConversationPreview>(
          conversationQueryKey(conversationId),
          (data) => patchOtherParticipant(data, payload),
        );
      }
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY, exact: true });
    };

    socket.on(PRESENCE_SOCKET_EVENT, handlePresenceChanged);

    return () => {
      socket.off(PRESENCE_SOCKET_EVENT, handlePresenceChanged);
    };
  }, [socket, queryClient, conversationId]);
};
