"use client";

import { useEffect, useState } from "react";

import { getSocket } from "@/shared/lib/socketClient";

import { EXPLORE_SOCKET_EVENTS, type LookCreatedPayload } from "../socketEvents";

export const useExploreFeedSocket = () => {
  const [newLookCount, setNewLookCount] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleLookCreated = (_lookCreatedPayload: LookCreatedPayload) => {
      setNewLookCount((count) => count + 1);
    };

    socket.on(EXPLORE_SOCKET_EVENTS.LOOK_CREATED, handleLookCreated);

    return () => {
      socket.off(EXPLORE_SOCKET_EVENTS.LOOK_CREATED, handleLookCreated);
      socket.disconnect();
    };
  }, []);

  const dismiss = () => setNewLookCount(0);

  return { newLookCount, dismiss };
};
