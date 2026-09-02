"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "outfiqe:taste-categories";
const CHANGE_EVENT = "outfiqe:taste-categories-changed";

const parseSlugs = (raw: string | null): string[] | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((slug) => typeof slug === "string")) return parsed;
  } catch {
    return null;
  }
  return null;
};

let snapshotRaw: string | null | undefined;
let snapshotSlugs: string[] | null = null;

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
    snapshotSlugs = parseSlugs(raw);
  }
  return snapshotSlugs;
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

const write = (slugs: string[] | null): void => {
  try {
    if (slugs) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    return;
  }
};

export const useTastePreferences = () => {
  const storedSlugs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const save = useCallback((slugs: string[]) => write(slugs), []);
  const reset = useCallback(() => write(null), []);

  return { storedSlugs, isCustomized: storedSlugs !== null, save, reset };
};
