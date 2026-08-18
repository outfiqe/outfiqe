"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

import { getOrSeedLastSeenAt, markSeenNow } from "@/shared/lib/lastSeenAt";
import {
  acquireSocketConnection,
  getSocket,
  releaseSocketConnection,
} from "@/shared/lib/socketClient";

import { EXPLORE_TAB } from "../explore.constants";
import { EXPLORE_SOCKET_EVENTS, type FeedSyncResultPayload } from "../socketEvents";

const LAST_SEEN_LOOK_AT_STORAGE_KEY = "outfiqe:explore:last-seen-look-at";
const LOOK_CREATED_RESYNC_DEBOUNCE_MS = 1500;

const isLiveSyncTab = (tab: string): boolean =>
  tab !== EXPLORE_TAB.FOR_YOU && tab !== EXPLORE_TAB.TRENDING;

const emitFeedSyncRequest = (socket: Socket, tab: string): void => {
  socket.emit(EXPLORE_SOCKET_EVENTS.FEED_SYNC_REQUEST, {
    tab,
    since: getOrSeedLastSeenAt(LAST_SEEN_LOOK_AT_STORAGE_KEY),
  });
};

export const useExploreFeedSocket = (tab: string) => {
  const [newLookCount, setNewLookCount] = useState(0);
  const [syncedTab, setSyncedTab] = useState(tab);
  const tabRef = useRef(tab);
  const resyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (syncedTab !== tab) {
    setSyncedTab(tab);
    setNewLookCount(0);
  }

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  useEffect(() => {
    const socket = acquireSocketConnection();

    const requestFeedSync = () => {
      if (!isLiveSyncTab(tabRef.current)) return;
      emitFeedSyncRequest(socket, tabRef.current);
    };

    const scheduleFeedResync = () => {
      if (!isLiveSyncTab(tabRef.current)) return;
      clearTimeout(resyncTimeoutRef.current);
      resyncTimeoutRef.current = setTimeout(requestFeedSync, LOOK_CREATED_RESYNC_DEBOUNCE_MS);
    };

    const handleFeedSyncResult = ({ count }: FeedSyncResultPayload) => {
      setNewLookCount(count);
    };

    socket.on("connect", requestFeedSync);
    socket.on(EXPLORE_SOCKET_EVENTS.FEED_SYNC_RESULT, handleFeedSyncResult);
    socket.on(EXPLORE_SOCKET_EVENTS.LOOK_CREATED, scheduleFeedResync);

    return () => {
      clearTimeout(resyncTimeoutRef.current);
      socket.off("connect", requestFeedSync);
      socket.off(EXPLORE_SOCKET_EVENTS.FEED_SYNC_RESULT, handleFeedSyncResult);
      socket.off(EXPLORE_SOCKET_EVENTS.LOOK_CREATED, scheduleFeedResync);
      releaseSocketConnection();
    };
  }, []);

  useEffect(() => {
    if (!isLiveSyncTab(tab)) return;

    const socket = getSocket();
    if (!socket.connected) return;

    clearTimeout(resyncTimeoutRef.current);
    emitFeedSyncRequest(socket, tab);
  }, [tab]);

  const dismiss = () => {
    setNewLookCount(0);
    markSeenNow(LAST_SEEN_LOOK_AT_STORAGE_KEY);
  };

  return { newLookCount, dismiss };
};
