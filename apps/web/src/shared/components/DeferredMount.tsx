"use client";

import { type ReactNode, useEffect, useState } from "react";

const IDLE_TIMEOUT_MS = 2000;
const FALLBACK_DELAY_MS = 200;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export const DeferredMount = ({ children }: { children: ReactNode }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const idleWindow = window as IdleWindow;

    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(() => setIsReady(true), {
        timeout: IDLE_TIMEOUT_MS,
      });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    const timer = setTimeout(() => setIsReady(true), FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return isReady ? <>{children}</> : null;
};
