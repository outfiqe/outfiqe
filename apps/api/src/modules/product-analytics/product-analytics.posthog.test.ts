import { beforeEach, describe, expect, it, vi } from "vitest";

const environment = vi.hoisted(() => {
  const testEnvironment: { projectToken: string | undefined } = { projectToken: "phc_test" };
  return testEnvironment;
});
const posthogClient = vi.hoisted(() => ({ capture: vi.fn(), shutdown: vi.fn() }));
const PostHogConstructor = vi.hoisted(() =>
  vi.fn(function constructPosthogClient() {
    return posthogClient;
  }),
);

vi.mock("posthog-node", () => ({ PostHog: PostHogConstructor }));

vi.mock("#config/env.config.js", () => ({
  env: {
    get POSTHOG_PROJECT_TOKEN() {
      return environment.projectToken;
    },
    POSTHOG_HOST: "https://us.i.posthog.com",
  },
}));

const loadPosthogBridge = async () => {
  vi.resetModules();
  return import("./product-analytics.posthog.js");
};

const purchaseEvent = {
  distinctId: "user-1",
  event: "checkout:order_place",
  properties: { order_id: "order-1" },
};

beforeEach(() => {
  environment.projectToken = "phc_test";
  vi.clearAllMocks();
});

describe("sendToPosthog", () => {
  it("does nothing when no project token is set", async () => {
    environment.projectToken = undefined;
    const { sendToPosthog } = await loadPosthogBridge();

    sendToPosthog(purchaseEvent);

    expect(PostHogConstructor).not.toHaveBeenCalled();
  });

  it("sends through one shared client without guessing a location from the server's address", async () => {
    const { sendToPosthog } = await loadPosthogBridge();

    sendToPosthog(purchaseEvent);
    sendToPosthog(purchaseEvent);

    expect(PostHogConstructor).toHaveBeenCalledTimes(1);
    expect(PostHogConstructor).toHaveBeenCalledWith("phc_test", {
      host: "https://us.i.posthog.com",
    });
    expect(posthogClient.capture).toHaveBeenCalledWith({ ...purchaseEvent, disableGeoip: true });
  });

  it("never lets a failed send break the caller", async () => {
    posthogClient.capture.mockImplementationOnce(() => {
      throw new Error("queue full");
    });
    const { sendToPosthog } = await loadPosthogBridge();

    expect(() => sendToPosthog(purchaseEvent)).not.toThrow();
  });
});

describe("flushProductAnalytics", () => {
  it("sends anything queued before the process stops", async () => {
    const { sendToPosthog, flushProductAnalytics } = await loadPosthogBridge();
    sendToPosthog(purchaseEvent);

    await flushProductAnalytics();

    expect(posthogClient.shutdown).toHaveBeenCalledTimes(1);
  });

  it("has nothing to flush when nothing was ever sent", async () => {
    const { flushProductAnalytics } = await loadPosthogBridge();

    await flushProductAnalytics();

    expect(posthogClient.shutdown).not.toHaveBeenCalled();
  });
});
