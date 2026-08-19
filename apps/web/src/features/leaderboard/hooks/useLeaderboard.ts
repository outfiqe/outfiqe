"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  acquireSocketConnection,
  getSocket,
  releaseSocketConnection,
} from "@/shared/lib/socketClient";

import { leaderboardApi } from "../api/leaderboardApi";
import type { LeaderboardSnapshot } from "../api/leaderboardSchemas";
import { LEADERBOARD_SOCKET_EVENTS, type LeaderboardCategory } from "../leaderboard.constants";

const leaderboardQueryKey = (category: LeaderboardCategory) => ["leaderboard", category] as const;

export const useLeaderboard = (category: LeaderboardCategory) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: leaderboardQueryKey(category),
    queryFn: () => leaderboardApi.listBrands(category),
  });

  useEffect(() => {
    const socket = acquireSocketConnection();

    const handleUpdated = (payload: LeaderboardSnapshot) => {
      queryClient.setQueryData(leaderboardQueryKey(payload.category), payload);
    };

    socket.on(LEADERBOARD_SOCKET_EVENTS.UPDATED, handleUpdated);

    return () => {
      socket.off(LEADERBOARD_SOCKET_EVENTS.UPDATED, handleUpdated);
      releaseSocketConnection();
    };
  }, [queryClient]);

  useEffect(() => {
    const socket = getSocket();

    const subscribe = () => socket.emit(LEADERBOARD_SOCKET_EVENTS.SUBSCRIBE, { category });
    subscribe();
    socket.on("connect", subscribe);

    return () => {
      socket.emit(LEADERBOARD_SOCKET_EVENTS.UNSUBSCRIBE, { category });
      socket.off("connect", subscribe);
    };
  }, [category]);

  return query;
};
