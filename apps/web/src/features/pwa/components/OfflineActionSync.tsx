"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useIsOnline } from "../hooks/useIsOnline";
import { drainQueuedOfflineActions } from "../utils/offlineActionProcessor";

export const OfflineActionSync = () => {
  const isOnline = useIsOnline();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOnline) return;
    void drainQueuedOfflineActions(queryClient);
  }, [isOnline, queryClient]);

  return null;
};
