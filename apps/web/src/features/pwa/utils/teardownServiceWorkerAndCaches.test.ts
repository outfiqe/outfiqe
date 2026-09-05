import { afterEach, describe, expect, it, vi } from "vitest";

import { teardownServiceWorkerAndCaches } from "./teardownServiceWorkerAndCaches";

const stubServiceWorker = (registrations: { unregister: ReturnType<typeof vi.fn> }[]) => {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistrations: vi.fn().mockResolvedValue(registrations) },
  });
};

afterEach(() => {
  Reflect.deleteProperty(navigator, "serviceWorker");
  vi.unstubAllGlobals();
});

describe("teardownServiceWorkerAndCaches", () => {
  it("unregisters every service worker registration and deletes every cache", async () => {
    const unregisterOne = vi.fn().mockResolvedValue(true);
    const unregisterTwo = vi.fn().mockResolvedValue(true);
    stubServiceWorker([{ unregister: unregisterOne }, { unregister: unregisterTwo }]);
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["visited-pages", "uploaded-images"]),
      delete: deleteCache,
    });

    await teardownServiceWorkerAndCaches();

    expect(unregisterOne).toHaveBeenCalledTimes(1);
    expect(unregisterTwo).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith("visited-pages");
    expect(deleteCache).toHaveBeenCalledWith("uploaded-images");
  });

  it("never throws when a registration refuses to unregister", async () => {
    stubServiceWorker([{ unregister: vi.fn().mockRejectedValue(new Error("busy")) }]);
    vi.stubGlobal("caches", { keys: vi.fn().mockResolvedValue([]), delete: vi.fn() });

    await expect(teardownServiceWorkerAndCaches()).resolves.toBeUndefined();
  });

  it("never throws when a cache refuses to delete", async () => {
    stubServiceWorker([]);
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["visited-pages"]),
      delete: vi.fn().mockRejectedValue(new Error("in use")),
    });

    await expect(teardownServiceWorkerAndCaches()).resolves.toBeUndefined();
  });

  it("never throws when there is no service worker support", async () => {
    Reflect.deleteProperty(navigator, "serviceWorker");
    vi.stubGlobal("caches", { keys: vi.fn().mockResolvedValue([]), delete: vi.fn() });

    await expect(teardownServiceWorkerAndCaches()).resolves.toBeUndefined();
  });

  it("never throws when there is no cache storage at all", async () => {
    stubServiceWorker([]);
    vi.stubGlobal("caches", undefined);

    await expect(teardownServiceWorkerAndCaches()).resolves.toBeUndefined();
  });
});
