import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

import { isPersistableQueryKey, PERSISTED_QUERY_CACHE_KEY } from "../constants/offlineCache";
import { runWithoutFailingWhenStorageIsUnavailable } from "./browserDatabase";

const keepOnlyAllowlistedQueries = (
  client: PersistedClient | undefined,
): PersistedClient | undefined => {
  if (!client) return client;

  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries.filter((query) => isPersistableQueryKey(query.queryKey)),
    },
  };
};

export const createQueryPersister = (): Persister => ({
  persistClient: (client) =>
    runWithoutFailingWhenStorageIsUnavailable(() => set(PERSISTED_QUERY_CACHE_KEY, client)),
  restoreClient: async () =>
    keepOnlyAllowlistedQueries(
      await runWithoutFailingWhenStorageIsUnavailable(() =>
        get<PersistedClient>(PERSISTED_QUERY_CACHE_KEY),
      ),
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
