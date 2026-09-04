import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PERSISTED_QUERY_CACHE_KEY } from "../constants/offlineCache";
import { clearPersistedQueries, createQueryPersister, shouldPersistQuery } from "./queryPersister";

const { del, get, set } = vi.hoisted(() => ({
  del: vi.fn(() => Promise.resolve()),
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
}));

vi.mock("idb-keyval", () => ({ del, get, set }));

const asQuery = (queryKey: readonly unknown[], status: string) => ({ queryKey, state: { status } });

beforeEach(() => {
  del.mockClear().mockResolvedValue(undefined);
  get.mockClear().mockResolvedValue(undefined);
  set.mockClear().mockResolvedValue(undefined);
  vi.stubGlobal("indexedDB", {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shouldPersistQuery", () => {
  it("saves a successful public query", () => {
    expect(shouldPersistQuery(asQuery(["products"], "success"))).toBe(true);
  });

  it("never saves a private query, even when it succeeded", () => {
    expect(shouldPersistQuery(asQuery(["orders"], "success"))).toBe(false);
  });

  it("never saves a failed request, which would show an error offline forever", () => {
    expect(shouldPersistQuery(asQuery(["products"], "error"))).toBe(false);
  });
});

describe("createQueryPersister", () => {
  it("reads and writes under one key", async () => {
    const persister = createQueryPersister();

    await persister.persistClient({
      buster: "1",
      timestamp: 1,
      clientState: { mutations: [], queries: [] },
    });
    await persister.restoreClient();
    await persister.removeClient();

    expect(set).toHaveBeenCalledWith(PERSISTED_QUERY_CACHE_KEY, expect.anything());
    expect(get).toHaveBeenCalledWith(PERSISTED_QUERY_CACHE_KEY);
    expect(del).toHaveBeenCalledWith(PERSISTED_QUERY_CACHE_KEY);
  });

  it("does nothing, without throwing, in an environment with no database at all", async () => {
    vi.unstubAllGlobals();
    const persister = createQueryPersister();

    await expect(
      persister.persistClient({
        buster: "1",
        timestamp: 1,
        clientState: { mutations: [], queries: [] },
      }),
    ).resolves.toBeUndefined();
    expect(set).not.toHaveBeenCalled();
  });

  it("keeps working when the browser blocks its database", async () => {
    const blocked = new Error("IndexedDB is not available");
    set.mockRejectedValue(blocked);
    get.mockRejectedValue(blocked);
    del.mockRejectedValue(blocked);
    const persister = createQueryPersister();

    await expect(
      persister.persistClient({
        buster: "1",
        timestamp: 1,
        clientState: { mutations: [], queries: [] },
      }),
    ).resolves.toBeUndefined();
    await expect(persister.restoreClient()).resolves.toBeUndefined();
    await expect(persister.removeClient()).resolves.toBeUndefined();
  });
});

describe("clearPersistedQueries", () => {
  it("forgets everything saved for offline reading", async () => {
    await clearPersistedQueries();

    expect(del).toHaveBeenCalledWith(PERSISTED_QUERY_CACHE_KEY);
  });

  it("never fails signing out when the database cannot be reached", async () => {
    del.mockRejectedValue(new Error("blocked"));

    await expect(clearPersistedQueries()).resolves.toBeUndefined();
  });
});
