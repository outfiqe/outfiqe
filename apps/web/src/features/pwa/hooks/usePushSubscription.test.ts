import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const subscribeToPush = vi.fn();
const unsubscribeFromPush = vi.fn();
let pwaEnabled = true;
let webPushSupported = true;
let iosBrowser = false;
let standalone = false;

vi.mock("../constants/pwaFeatureFlag", () => ({
  get isPwaEnabled() {
    return pwaEnabled;
  },
}));

vi.mock("../utils/pushClient", () => ({ subscribeToPush, unsubscribeFromPush }));

vi.mock("../utils/standalone", () => ({
  supportsWebPush: () => webPushSupported,
  isIosBrowser: () => iosBrowser,
  isRunningStandalone: () => standalone,
}));

const { usePushSubscription } = await import("./usePushSubscription");

const setPermission = (value: NotificationPermission) => {
  const requestPermission = vi.fn(async () => {
    permissionState.value = value;
    return value;
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    get: () => ({ permission: permissionState.value, requestPermission }),
  });
  permissionState.value =
    value === "granted" ? "granted" : value === "denied" ? "denied" : "default";
};

const grantOnRequest = (grantedValue: NotificationPermission) => {
  const requestPermission = vi.fn(async () => {
    permissionState.value = grantedValue;
    return grantedValue;
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    get: () => ({ permission: permissionState.value, requestPermission }),
  });
  permissionState.value = "default";
};

const permissionState = { value: "default" as NotificationPermission };

beforeEach(() => {
  pwaEnabled = true;
  webPushSupported = true;
  iosBrowser = false;
  standalone = false;
  subscribeToPush.mockReset().mockResolvedValue(true);
  unsubscribeFromPush.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: { query: () => Promise.reject(new Error("not supported in test")) },
  });
  setPermission("default");
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "permissions");
});

describe("usePushSubscription", () => {
  it("is unavailable when the feature flag is off", async () => {
    pwaEnabled = false;
    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe("unavailable"));
  });

  it("is unavailable when the browser cannot do web push", async () => {
    webPushSupported = false;
    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe("unavailable"));
  });

  it("asks an iOS user in a browser tab to install the app first", async () => {
    iosBrowser = true;
    standalone = false;
    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe("needs-install"));
  });

  it("offers to enable when permission has not been asked yet", async () => {
    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe("can-enable"));
  });

  it("reflects a permission that was already granted", async () => {
    setPermission("granted");
    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe("enabled"));
  });

  it("reflects a permission that was blocked", async () => {
    setPermission("denied");
    const { result } = renderHook(() => usePushSubscription());

    await waitFor(() => expect(result.current.state).toBe("blocked"));
  });

  it("subscribes and lands on enabled when the user says yes", async () => {
    grantOnRequest("granted");
    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.state).toBe("can-enable"));

    await act(async () => {
      await result.current.enable();
    });

    expect(subscribeToPush).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("enabled");
  });

  it("lands on blocked when the user says no to the browser prompt", async () => {
    grantOnRequest("denied");
    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.state).toBe("can-enable"));

    await act(async () => {
      await result.current.enable();
    });

    expect(subscribeToPush).not.toHaveBeenCalled();
    expect(result.current.state).toBe("blocked");
  });

  it("surfaces a failure without crashing", async () => {
    grantOnRequest("granted");
    subscribeToPush.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.state).toBe("can-enable"));

    await act(async () => {
      await result.current.enable();
    });

    expect(result.current.state).toBe("failed");
  });
});
