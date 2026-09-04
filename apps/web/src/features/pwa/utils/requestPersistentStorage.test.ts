import { afterEach, describe, expect, it, vi } from "vitest";

import { requestPersistentStorage } from "./requestPersistentStorage";

const setStorage = (value: unknown) => {
  Object.defineProperty(navigator, "storage", { configurable: true, value });
};

afterEach(() => {
  Reflect.deleteProperty(navigator, "storage");
});

describe("requestPersistentStorage", () => {
  it("asks the browser to keep saved content when it is not already promised", async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    setStorage({ persisted: () => Promise.resolve(false), persist });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("does not ask again once storage is already promised", async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    setStorage({ persisted: () => Promise.resolve(true), persist });

    await expect(requestPersistentStorage()).resolves.toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it("carries on when the browser refuses, as Safari usually does", async () => {
    setStorage({
      persisted: () => Promise.resolve(false),
      persist: () => Promise.resolve(false),
    });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it("carries on when the browser does not support the request at all", async () => {
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it("never throws when the request itself fails", async () => {
    setStorage({
      persisted: () => Promise.reject(new Error("blocked")),
      persist: () => Promise.reject(new Error("blocked")),
    });

    await expect(requestPersistentStorage()).resolves.toBe(false);
  });
});
