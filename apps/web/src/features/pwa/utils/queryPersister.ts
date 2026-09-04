import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

import { isPersistableQueryKey, PERSISTED_QUERY_CACHE_KEY } from "../constants/offlineCache";

const isBrowserDatabaseAvailable = () => typeof indexedDB !== "undefined" && indexedDB !== null;

const runWithoutFailingWhenStorageIsUnavailable = async <T>(
  storageOperation: () => Promise<T>,
): Promise<T | undefined> => {
  if (!isBrowserDatabaseAvailable()) return undefined;

  try {
    return await storageOperation();
  } catch {
    return undefined;
  }
};

export const createQueryPersister = (): Persister => ({
  persistClient: (client) =>
    runWithoutFailingWhenStorageIsUnavailable(() => set(PERSISTED_QUERY_CACHE_KEY, client)),
  restoreClient: () =>
    runWithoutFailingWhenStorageIsUnavailable(() =>
      get<PersistedClient>(PERSISTED_QUERY_CACHE_KEY),
    ),
  removeClient: () =>
    runWithoutFailingWhenStorageIsUnavailable(() => del(PERSISTED_QUERY_CACHE_KEY)),
});

export const clearPersistedQueries = async (): Promise<void> => {
  await runWithoutFailingWhenStorageIsUnavailable(() => del(PERSISTED_QUERY_CACHE_KEY));
};

type CompletedQuery = {
  queryKey: readonly unknown[];
  state: { status: string };
};

export const shouldPersistQuery = ({ queryKey, state }: CompletedQuery): boolean =>
  state.status === "success" && isPersistableQueryKey(queryKey);
