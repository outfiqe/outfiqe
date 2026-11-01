import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeToPush } from "./pushClient";

const trackEvent = vi.fn();
const apiGet = vi.fn();
const apiPost = vi.fn();

vi.mock("@/features/analytics/utils/analyticsClient", () => ({
  trackEvent: (...trackedEvent: unknown[]) => trackEvent(...trackedEvent),
}));

vi.mock("@/shared/lib/apiClient", () => ({
  apiClient: {
    get: (...request: unknown[]) => apiGet(...request),
    post: (...request: unknown[]) => apiPost(...request),
  },
}));

const VAPID_PUBLIC_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

const fakeSubscription = {
  endpoint: "https://push.example.test/endpoint",
  toJSON: () => ({ keys: { p256dh: "p256dh-key", auth: "auth-key" } }),
};

const pushManager = { getSubscription: vi.fn(), subscribe: vi.fn() };

beforeEach(() => {
  apiGet.mockResolvedValue({ data: { publicKey: VAPID_PUBLIC_KEY } });
  apiPost.mockResolvedValue({ data: null });
  pushManager.subscribe.mockResolvedValue(fakeSubscription);
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager }) },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("subscribeToPush analytics", () => {
  it("records push being switched on for a new subscription", async () => {
    pushManager.getSubscription.mockResolvedValue(null);

    await expect(subscribeToPush()).resolves.toBe(true);

    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.PUSH_ENABLE, {});
  });

  it("records nothing when an existing subscription is only re-sent to the server", async () => {
    pushManager.getSubscription.mockResolvedValue(fakeSubscription);

    await expect(subscribeToPush()).resolves.toBe(true);

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("records nothing when push isn't set up on the server", async () => {
    apiGet.mockResolvedValue({ data: { publicKey: null } });

    await expect(subscribeToPush()).resolves.toBe(false);

    expect(trackEvent).not.toHaveBeenCalled();
  });
});
