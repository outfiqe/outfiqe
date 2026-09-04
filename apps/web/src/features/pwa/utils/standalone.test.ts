import { afterEach, describe, expect, it, vi } from "vitest";

import { isIosBrowser, isRunningStandalone, supportsWebPush } from "./standalone";

const setUserAgent = (value: string) => {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value });
};

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "standalone");
});

describe("isRunningStandalone", () => {
  it("is true when the display-mode media query matches", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));

    expect(isRunningStandalone()).toBe(true);
  });

  it("is true on an installed iOS app via navigator.standalone", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    Object.defineProperty(navigator, "standalone", { configurable: true, value: true });

    expect(isRunningStandalone()).toBe(true);
  });

  it("is false in a plain browser tab", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));

    expect(isRunningStandalone()).toBe(false);
  });
});

describe("isIosBrowser", () => {
  it("recognises an iPhone", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");

    expect(isIosBrowser()).toBe(true);
  });

  it("recognises an iPad that reports a desktop user agent", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    Object.defineProperty(navigator, "platform", { configurable: true, value: "MacIntel" });
    Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 5 });

    expect(isIosBrowser()).toBe(true);
  });

  it("is false on Android", () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 14)");
    Object.defineProperty(navigator, "platform", { configurable: true, value: "Linux armv8l" });
    Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 5 });

    expect(isIosBrowser()).toBe(false);
  });
});

describe("supportsWebPush", () => {
  it("needs a service worker, a push manager, and the Notification API", () => {
    vi.stubGlobal("PushManager", function PushManagerStub() {});
    vi.stubGlobal("Notification", function NotificationStub() {});
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {} });

    expect(supportsWebPush()).toBe(true);

    Reflect.deleteProperty(navigator, "serviceWorker");
    expect(supportsWebPush()).toBe(false);
  });
});
