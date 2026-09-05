"use client";

import { useEffect } from "react";

import { useIsOnline } from "../hooks/useIsOnline";
import { drainQueuedOfflineActions } from "../utils/offlineActionProcessor";

export const OfflineActionSync = () => {
  const isOnline = useIsOnline();

  useEffect(() => {
    if (!isOnline) return;
    void drainQueuedOfflineActions();
  }, [isOnline]);

  return null;
};
