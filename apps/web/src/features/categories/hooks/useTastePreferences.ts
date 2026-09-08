"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { useAuth } from "@/features/auth";

import { tastePreferencesApi } from "../api/tastePreferencesApi";
import {
  parseTasteSlugs,
  serializeTasteSlugs,
  TASTE_CATEGORIES_COOKIE_MAX_AGE_SECONDS,
  TASTE_CATEGORIES_COOKIE_NAME,
  TASTE_CATEGORIES_STORAGE_KEY,
  TASTE_PREFERENCES_QUERY_KEY,
} from "../lib/tasteSlugs";

const CHANGE_EVENT = "outfiqe:taste-categories-changed";
const SERVER_STALE_TIME_MS = 5 * 60 * 1000;

let snapshotRaw: string | null | undefined;
let snapshotSlugs: string[] | null = null;

const readRaw = (): string | null => {
  try {
    return window.localStorage.getItem(TASTE_CATEGORIES_STORAGE_KEY);
  } catch {
    return null;
  }
};

const getSnapshot = (): string[] | null => {
  const raw = readRaw();
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshotSlugs = parseTasteSlugs(raw);
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

const writeTasteCookie = (slugs: string[] | null): void => {
  try {
    const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
    const value = slugs ? encodeURIComponent(serializeTasteSlugs(slugs)) : "";
    const maxAge = slugs ? TASTE_CATEGORIES_COOKIE_MAX_AGE_SECONDS : 0;
    document.cookie = `${TASTE_CATEGORIES_COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureFlag}`;
  } catch {
    return;
  }
};

const writeLocal = (slugs: string[] | null): void => {
  try {
    if (slugs) window.localStorage.setItem(TASTE_CATEGORIES_STORAGE_KEY, JSON.stringify(slugs));
    else window.localStorage.removeItem(TASTE_CATEGORIES_STORAGE_KEY);
    writeTasteCookie(slugs);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    return;
  }
};

const useLocalTastePreferences = () => {
  const storedSlugs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const save = useCallback((slugs: string[]) => writeLocal(slugs), []);
  const reset = useCallback(() => writeLocal(null), []);
  return { storedSlugs, save, reset };
};

type TastePreferences = {
  storedSlugs: string[] | null;
  isCustomized: boolean;
  save: (slugs: string[]) => void;
  reset: () => void;
};

export const useTastePreferences = (): TastePreferences => {
  const { isAuthenticated, isAuthResolved } = useAuth();
  const isSignedIn = isAuthResolved && isAuthenticated;

  const {
    storedSlugs: localSlugs,
    save: saveLocal,
    reset: resetLocal,
  } = useLocalTastePreferences();
  const queryClient = useQueryClient();

  const serverQuery = useQuery({
    queryKey: TASTE_PREFERENCES_QUERY_KEY,
    queryFn: tastePreferencesApi.get,
    enabled: isSignedIn,
    staleTime: SERVER_STALE_TIME_MS,
  });

  const serverMutation = useMutation({
    mutationFn: (slugs: string[]) =>
      slugs.length === 0 ? tastePreferencesApi.clear() : tastePreferencesApi.set(slugs),
    onMutate: (slugs) => {
      queryClient.setQueryData<string[] | null>(
        TASTE_PREFERENCES_QUERY_KEY,
        slugs.length === 0 ? null : slugs,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASTE_PREFERENCES_QUERY_KEY }),
  });

  const serverSlugs = serverQuery.data ?? null;
  const isServerLoaded = serverQuery.isSuccess;
  const mutate = serverMutation.mutate;
  const isMutating = serverMutation.isPending;

  useEffect(() => {
    if (isSignedIn && isServerLoaded && serverSlugs === null && localSlugs && !isMutating) {
      mutate(localSlugs);
    }
  }, [isSignedIn, isServerLoaded, serverSlugs, localSlugs, isMutating, mutate]);

  const storedSlugs = isSignedIn ? (serverSlugs ?? localSlugs) : localSlugs;

  useEffect(() => {
    if (storedSlugs) writeTasteCookie(storedSlugs);
  }, [storedSlugs]);

  const save = useCallback(
    (slugs: string[]) => {
      saveLocal(slugs);
      if (isSignedIn) mutate(slugs);
    },
    [saveLocal, isSignedIn, mutate],
  );

  const reset = useCallback(() => {
    resetLocal();
    if (isSignedIn) mutate([]);
  }, [resetLocal, isSignedIn, mutate]);

  return { storedSlugs, isCustomized: storedSlugs !== null, save, reset };
};
