"use client";

import { useCallback, useSyncExternalStore } from "react";

const NO_MATCH_ON_SERVER = false;

const canMatchMedia = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onQueryChange: () => void) => {
      if (!canMatchMedia()) return () => {};

      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onQueryChange);
      return () => mediaQueryList.removeEventListener("change", onQueryChange);
    },
    [query],
  );

  const getMatches = useCallback(
    () => (canMatchMedia() ? window.matchMedia(query).matches : NO_MATCH_ON_SERVER),
    [query],
  );

  return useSyncExternalStore(subscribe, getMatches, () => NO_MATCH_ON_SERVER);
};
