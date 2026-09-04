"use client";

import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

const subscribeToConnectionChanges = (notifyReact: () => void) =>
  onlineManager.subscribe(notifyReact);

const readIsOnline = () => onlineManager.isOnline();

const assumeOnlineWhileRenderingOnServer = () => true;

export const useIsOnline = (): boolean =>
  useSyncExternalStore(
    subscribeToConnectionChanges,
    readIsOnline,
    assumeOnlineWhileRenderingOnServer,
  );
