"use client";

import { type EventSocket, toEventSocket } from "@outfiqe/hooks";
import { useCallback, useSyncExternalStore } from "react";

import { useAuth } from "@/features/auth";
import {
  acquireSocketConnection,
  getSocket,
  releaseSocketConnection,
} from "@/shared/lib/socketClient";

import { ChatAvailabilitySettings } from "./ChatAvailabilitySettings";

const getSocketSnapshot = (): EventSocket => toEventSocket(getSocket());
const getServerSocketSnapshot = (): null => null;

export const SiteChatAvailabilitySettings = () => {
  const { isAuthenticated } = useAuth();

  const subscribeToSocket = useCallback(
    (_onStoreChange: () => void): (() => void) => {
      if (!isAuthenticated) return () => {};
      acquireSocketConnection();
      return () => releaseSocketConnection();
    },
    [isAuthenticated],
  );
  const socket = useSyncExternalStore(
    subscribeToSocket,
    getSocketSnapshot,
    getServerSocketSnapshot,
  );

  return <ChatAvailabilitySettings socket={socket} />;
};
