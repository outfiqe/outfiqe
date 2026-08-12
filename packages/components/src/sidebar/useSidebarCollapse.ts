"use client";

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 1023px)";
const COLLAPSE_EVENT = "outfiqe:sidebar-collapse-change";

const subscribeToViewport = (onChange: () => void): (() => void) => {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

const getIsMobileSnapshot = (): boolean => window.matchMedia(MOBILE_QUERY).matches;
const getIsMobileServerSnapshot = (): boolean => false;

const subscribeToStorage =
  (storageKey: string) =>
  (onChange: () => void): (() => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === storageKey) onChange();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(COLLAPSE_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(COLLAPSE_EVENT, onChange);
    };
  };

export type SidebarCollapse = {
  readonly collapsed: boolean;
  readonly isMobile: boolean;
  readonly toggle: () => void;
};

export const useSidebarCollapse = (storageKey: string): SidebarCollapse => {
  const isMobile = useSyncExternalStore(
    subscribeToViewport,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot,
  );
  const manualCollapsed = useSyncExternalStore(
    subscribeToStorage(storageKey),
    () => window.localStorage.getItem(storageKey) === "1",
    () => false,
  );

  const toggle = (): void => {
    const next = window.localStorage.getItem(storageKey) !== "1";
    window.localStorage.setItem(storageKey, next ? "1" : "0");
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  };

  return { collapsed: isMobile || manualCollapsed, isMobile, toggle };
};
