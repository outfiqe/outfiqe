"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "outfiqe:dashboard-nav-pins";
const CHANGE_EVENT = "outfiqe:dashboard-nav-pins-changed";

const parsePinnedIds = (raw: string | null): string[] | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) return parsed;
  } catch {
    return null;
  }
  return null;
};

let snapshotRaw: string | null | undefined;
let snapshotPinnedIds: string[] | null = null;

const readRaw = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const getSnapshot = (): string[] | null => {
  const raw = readRaw();
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshotPinnedIds = parsePinnedIds(raw);
  }
  return snapshotPinnedIds;
};

const getServerSnapshot = (): null => null;

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
};

const writeLocal = (pinnedIds: string[] | null): void => {
  try {
    if (pinnedIds) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedIds));
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    return;
  }
};

type NavPreferences = {
  pinnedIds: string[] | null;
  isCustomized: boolean;
  save: (pinnedIds: string[]) => void;
  reset: () => void;
};

export const useNavPreferences = (): NavPreferences => {
  const pinnedIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const save = useCallback((next: string[]) => writeLocal(next), []);
  const reset = useCallback(() => writeLocal(null), []);

  return { pinnedIds, isCustomized: pinnedIds !== null, save, reset };
};
