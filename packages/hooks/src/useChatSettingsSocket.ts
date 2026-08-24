"use client";

import type { ChatSettings } from "@outfiqe/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { EventSocket } from "./socketEventAdapter";
import { CHAT_BLOCKS_QUERY_KEY } from "./useChatBlocks";
import { CHAT_SETTINGS_QUERY_KEY } from "./useChatSettings";

const CHAT_SOCKET_EVENTS = {
  SETTINGS_UPDATED: "chat:settings:updated",
  BLOCK_LIST_UPDATED: "chat:block-list:updated",
} as const;

export const useChatSettingsSocket = (socket: EventSocket | null | undefined): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleSettingsUpdated = (settings: ChatSettings): void => {
      queryClient.setQueryData<ChatSettings>(CHAT_SETTINGS_QUERY_KEY, settings);
    };

    const handleBlockListUpdated = (): void => {
      void queryClient.invalidateQueries({ queryKey: CHAT_BLOCKS_QUERY_KEY });
    };

    const reconcile = (): void => {
      void queryClient.invalidateQueries({ queryKey: CHAT_SETTINGS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CHAT_BLOCKS_QUERY_KEY });
    };

    socket.on(CHAT_SOCKET_EVENTS.SETTINGS_UPDATED, handleSettingsUpdated);
    socket.on(CHAT_SOCKET_EVENTS.BLOCK_LIST_UPDATED, handleBlockListUpdated);
    socket.on("connect", reconcile);

    return () => {
      socket.off(CHAT_SOCKET_EVENTS.SETTINGS_UPDATED, handleSettingsUpdated);
      socket.off(CHAT_SOCKET_EVENTS.BLOCK_LIST_UPDATED, handleBlockListUpdated);
      socket.off("connect", reconcile);
    };
  }, [socket, queryClient]);
};
