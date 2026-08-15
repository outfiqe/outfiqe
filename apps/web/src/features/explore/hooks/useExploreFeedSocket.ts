"use client";

import { useEffect, useRef, useState } from "react";

import { getOrSeedLastSeenAt, markSeenNow } from "@/shared/lib/lastSeenAt";
import { getSocket } from "@/shared/lib/socketClient";

import {
  EXPLORE_SOCKET_EVENTS,
  type FeedSyncResultPayload,
  type LookCreatedPayload,
} from "../socketEvents";

const LAST_SEEN_LOOK_AT_STORAGE_KEY = "outfiqe:explore:last-seen-look-at";

export const useExploreFeedSocket = (tab: string) => {
  const [newLookCount, setNewLookCount] = useState(0);
  const tabRef = useRef(tab);
  const seenLookIdsRef = useRef(new Set<string>());

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const requestFeedSync = () => {
      socket.emit(EXPLORE_SOCKET_EVENTS.FEED_SYNC_REQUEST, {
        tab: tabRef.current,
        since: getOrSeedLastSeenAt(LAST_SEEN_LOOK_AT_STORAGE_KEY),
      });
    };

    const handleFeedSyncResult = ({ count }: FeedSyncResultPayload) => {
      setNewLookCount((current) => Math.max(current, count));
    };

    const handleLookCreated = ({ lookId }: LookCreatedPayload) => {
      if (seenLookIdsRef.current.has(lookId)) return;
      seenLookIdsRef.current.add(lookId);
      setNewLookCount((count) => count + 1);
    };

    socket.on("connect", requestFeedSync);
    socket.on(EXPLORE_SOCKET_EVENTS.FEED_SYNC_RESULT, handleFeedSyncResult);
    socket.on(EXPLORE_SOCKET_EVENTS.LOOK_CREATED, handleLookCreated);

    return () => {
      socket.off("connect", requestFeedSync);
      socket.off(EXPLORE_SOCKET_EVENTS.FEED_SYNC_RESULT, handleFeedSyncResult);
      socket.off(EXPLORE_SOCKET_EVENTS.LOOK_CREATED, handleLookCreated);
      socket.disconnect();
    };
  }, []);

  const dismiss = () => {
    setNewLookCount(0);
    seenLookIdsRef.current.clear();
    markSeenNow(LAST_SEEN_LOOK_AT_STORAGE_KEY);
  };

  return { newLookCount, dismiss };
};
