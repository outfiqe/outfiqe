"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  acquireSocketConnection,
  getSocket,
  releaseSocketConnection,
} from "@/shared/lib/socketClient";

import { creatorLeaderboardApi } from "../api/creatorLeaderboardApi";
import type { CreatorLeaderboardSnapshot } from "../api/creatorLeaderboardSchemas";
import {
  CREATOR_LEADERBOARD_SOCKET_EVENTS,
  type CreatorLeaderboardCategory,
} from "../creatorLeaderboard.constants";

const creatorLeaderboardQueryKey = (category: CreatorLeaderboardCategory) =>
  ["creator-leaderboard", category] as const;

export const useCreatorLeaderboard = (category: CreatorLeaderboardCategory) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: creatorLeaderboardQueryKey(category),
    queryFn: () => creatorLeaderboardApi.listCreators(category),
  });

  useEffect(() => {
    const socket = acquireSocketConnection();

    const handleUpdated = (payload: CreatorLeaderboardSnapshot) => {
      queryClient.setQueryData(creatorLeaderboardQueryKey(payload.category), payload);
    };

    socket.on(CREATOR_LEADERBOARD_SOCKET_EVENTS.UPDATED, handleUpdated);

    return () => {
      socket.off(CREATOR_LEADERBOARD_SOCKET_EVENTS.UPDATED, handleUpdated);
      releaseSocketConnection();
    };
  }, [queryClient]);

  useEffect(() => {
    const socket = getSocket();

    const subscribe = () => socket.emit(CREATOR_LEADERBOARD_SOCKET_EVENTS.SUBSCRIBE, { category });
    subscribe();
    socket.on("connect", subscribe);

    return () => {
      socket.emit(CREATOR_LEADERBOARD_SOCKET_EVENTS.UNSUBSCRIBE, { category });
      socket.off("connect", subscribe);
    };
  }, [category]);

  return query;
};
