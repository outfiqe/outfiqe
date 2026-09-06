"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

const NO_MATCH_ON_SERVER = false;

const canMatchMedia = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

type CachedMediaQueryList = {
  query: string;
  list: MediaQueryList;
};

export const useMediaQuery = (query: string): boolean => {
  const cachedRef = useRef<CachedMediaQueryList | null>(null);

  const resolveMediaQueryList = useCallback((): MediaQueryList | null => {
    if (!canMatchMedia()) return null;
    if (cachedRef.current?.query !== query) {
      cachedRef.current = { query, list: window.matchMedia(query) };
    }
    return cachedRef.current.list;
  }, [query]);

  const subscribe = useCallback(
    (onQueryChange: () => void) => {
      const mediaQueryList = resolveMediaQueryList();
      if (!mediaQueryList) return () => {};

      mediaQueryList.addEventListener("change", onQueryChange);
      return () => mediaQueryList.removeEventListener("change", onQueryChange);
    },
    [resolveMediaQueryList],
  );

  const getMatches = useCallback(
    () => resolveMediaQueryList()?.matches ?? NO_MATCH_ON_SERVER,
    [resolveMediaQueryList],
  );

  return useSyncExternalStore(subscribe, getMatches, () => NO_MATCH_ON_SERVER);
};
