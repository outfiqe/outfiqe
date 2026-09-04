import { afterEach, describe, expect, it, vi } from "vitest";

import { CLEAR_CACHED_CONTENT_MESSAGE } from "../constants/serviceWorkerMessages";
import { clearCachedContent } from "./clearCachedContent";

const setServiceWorker = (value: unknown) => {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value,
  });
};

afterEach(() => {
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("clearCachedContent", () => {
  it("tells the worker to forget saved pages and images", async () => {
    const postMessage = vi.fn();
    setServiceWorker({ getRegistration: () => Promise.resolve({ active: { postMessage } }) });

    await clearCachedContent();

    expect(postMessage).toHaveBeenCalledWith({ type: CLEAR_CACHED_CONTENT_MESSAGE });
  });

  it("does nothing when no worker is registered", async () => {
    setServiceWorker({ getRegistration: () => Promise.resolve(undefined) });

    await expect(clearCachedContent()).resolves.toBeUndefined();
  });

  it("never fails signing out when the worker cannot be reached", async () => {
    setServiceWorker({ getRegistration: () => Promise.reject(new Error("worker unavailable")) });

    await expect(clearCachedContent()).resolves.toBeUndefined();
  });

  it("does nothing in a browser without service worker support", async () => {
    await expect(clearCachedContent()).resolves.toBeUndefined();
  });
});
