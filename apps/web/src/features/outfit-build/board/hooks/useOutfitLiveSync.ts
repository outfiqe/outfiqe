"use client";

import { toEventSocket } from "@outfiqe/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { acquireSocketConnection, releaseSocketConnection } from "@/shared/lib/socketClient";

import type { OutfitView } from "../../api/outfitSchemas";
import { outfitQueryKey } from "../../hooks/outfitQueryKeys";

export const OUTFIT_SOCKET_EVENTS = {
  SUBSCRIBE: "outfit:subscribe",
  UNSUBSCRIBE: "outfit:unsubscribe",
  SYNC: "outfit:sync",
  SYNC_RESULT: "outfit:sync-result",
  UPDATED: "outfit:updated",
  REMOVED: "outfit:removed",
  AVAILABILITY_CHANGED: "outfit:availability-changed",
} as const;

const SOCKET_CONNECT_EVENT = "connect";
const SOCKET_DISCONNECT_EVENT = "disconnect";

type OutfitVersionPayload = { outfitId: string; version?: number; currentVersion?: number };

const isVersionPayloadFor = (payload: unknown, outfitId: string): payload is OutfitVersionPayload =>
  typeof payload === "object" &&
  payload !== null &&
  "outfitId" in payload &&
  payload.outfitId === outfitId;

export const useOutfitLiveSync = (outfitId: string, isEnabled: boolean) => {
  const queryClient = useQueryClient();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [wasRemoved, setWasRemoved] = useState(false);

  useEffect(() => {
    if (!isEnabled) return;

    const socket = toEventSocket(acquireSocketConnection());
    const queryKey = outfitQueryKey(outfitId);

    const localVersion = (): number | null => {
      const cachedView = queryClient.getQueryData<OutfitView>(queryKey);
      return cachedView?.kind === "board" ? cachedView.version : null;
    };

    const refetchWhenNewer = (announcedVersion: number | undefined) => {
      const knownVersion = localVersion();
      if (announcedVersion === undefined || knownVersion === null) return;
      if (announcedVersion > knownVersion) void queryClient.invalidateQueries({ queryKey });
    };

    const joinAndCatchUp = () => {
      setIsReconnecting(false);
      socket.emit(OUTFIT_SOCKET_EVENTS.SUBSCRIBE, { outfitId });
      const knownVersion = localVersion();
      if (knownVersion !== null) {
        socket.emit(OUTFIT_SOCKET_EVENTS.SYNC, { outfitId, sinceVersion: knownVersion });
      }
    };

    const handleUpdated = (payload: unknown) => {
      if (isVersionPayloadFor(payload, outfitId)) refetchWhenNewer(payload.version);
    };
    const handleSyncResult = (payload: unknown) => {
      if (isVersionPayloadFor(payload, outfitId)) refetchWhenNewer(payload.currentVersion);
    };
    const handleRemoved = (payload: unknown) => {
      if (!isVersionPayloadFor(payload, outfitId)) return;
      setWasRemoved(true);
      void queryClient.invalidateQueries({ queryKey });
    };
    const handleAvailabilityChanged = (payload: unknown) => {
      if (isVersionPayloadFor(payload, outfitId)) void queryClient.invalidateQueries({ queryKey });
    };
    const handleDisconnect = () => setIsReconnecting(true);

    socket.on(SOCKET_CONNECT_EVENT, joinAndCatchUp);
    socket.on(SOCKET_DISCONNECT_EVENT, handleDisconnect);
    socket.on(OUTFIT_SOCKET_EVENTS.UPDATED, handleUpdated);
    socket.on(OUTFIT_SOCKET_EVENTS.SYNC_RESULT, handleSyncResult);
    socket.on(OUTFIT_SOCKET_EVENTS.REMOVED, handleRemoved);
    socket.on(OUTFIT_SOCKET_EVENTS.AVAILABILITY_CHANGED, handleAvailabilityChanged);
    joinAndCatchUp();

    return () => {
      socket.emit(OUTFIT_SOCKET_EVENTS.UNSUBSCRIBE, { outfitId });
      socket.off(SOCKET_CONNECT_EVENT, joinAndCatchUp);
      socket.off(SOCKET_DISCONNECT_EVENT, handleDisconnect);
      socket.off(OUTFIT_SOCKET_EVENTS.UPDATED, handleUpdated);
      socket.off(OUTFIT_SOCKET_EVENTS.SYNC_RESULT, handleSyncResult);
      socket.off(OUTFIT_SOCKET_EVENTS.REMOVED, handleRemoved);
      socket.off(OUTFIT_SOCKET_EVENTS.AVAILABILITY_CHANGED, handleAvailabilityChanged);
      releaseSocketConnection();
    };
  }, [isEnabled, outfitId, queryClient]);

  return { isReconnecting, wasRemoved };
};
