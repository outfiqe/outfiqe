"use client";

import { useEffect } from "react";

import type { EventSocket } from "./socketEventAdapter";

const CONVERSATION_SOCKET_EVENTS = {
  SUBSCRIBE: "conversation:subscribe",
  UNSUBSCRIBE: "conversation:unsubscribe",
} as const;

export const useConversationRoomSubscription = (
  socket: EventSocket | null | undefined,
  conversationId: string | null,
): void => {
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit(CONVERSATION_SOCKET_EVENTS.SUBSCRIBE, { conversationId });

    return () => {
      socket.emit(CONVERSATION_SOCKET_EVENTS.UNSUBSCRIBE, { conversationId });
    };
  }, [socket, conversationId]);
};
