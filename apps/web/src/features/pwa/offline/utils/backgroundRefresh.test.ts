import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BACKGROUND_REFRESH_MIN_INTERVAL_MS,
  BACKGROUND_REFRESH_SYNC_TAG,
} from "../constants/backgroundRefresh";
import { registerBackgroundRefresh } from "./backgroundRefresh";

const stubServiceWorker = (registration: {
  periodicSync?: { register: ReturnType<typeof vi.fn> };
}) => {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve(registration) },
  });
};

const stubPermissionsQuery = (state: PermissionState | "error") => {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: {
      query:
        state === "error"
          ? vi.fn().mockRejectedValue(new Error("not supported"))
          : vi.fn().mockResolvedValue({ state }),
    },
  });
};

afterEach(() => {
  Reflect.deleteProperty(navigator, "serviceWorker");
  Reflect.deleteProperty(navigator, "permissions");
});

describe("registerBackgroundRefresh", () => {
  it("registers periodic sync once the browser has already granted the permission", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    stubServiceWorker({ periodicSync: { register } });
    stubPermissionsQuery("granted");

    const didRegister = await registerBackgroundRefresh();

    expect(register).toHaveBeenCalledWith(BACKGROUND_REFRESH_SYNC_TAG, {
      minInterval: BACKGROUND_REFRESH_MIN_INTERVAL_MS,
    });
    expect(didRegister).toBe(true);
  });

  it("does nothing when the permission has not been granted", async () => {
    const register = vi.fn();
    stubServiceWorker({ periodicSync: { register } });
    stubPermissionsQuery("prompt");

    await expect(registerBackgroundRefresh()).resolves.toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it("does nothing when the browser has no periodic sync manager at all", async () => {
    stubServiceWorker({});
    stubPermissionsQuery("granted");

    await expect(registerBackgroundRefresh()).resolves.toBe(false);
  });

  it("never throws when the Permissions API itself is unsupported", async () => {
    stubServiceWorker({ periodicSync: { register: vi.fn() } });
    stubPermissionsQuery("error");

    await expect(registerBackgroundRefresh()).resolves.toBe(false);
  });

  it("does nothing in a browser with no service worker support", async () => {
    Reflect.deleteProperty(navigator, "serviceWorker");

    await expect(registerBackgroundRefresh()).resolves.toBe(false);
  });
});
