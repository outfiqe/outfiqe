import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SERVICE_WORKER_ERROR_MESSAGE } from "../constants/serviceWorkerError";
import { ServiceWorkerErrorReporter } from "./ServiceWorkerErrorReporter";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const stubServiceWorker = (): EventTarget => {
  const serviceWorker = new EventTarget();
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorker });
  return serviceWorker;
};

afterEach(() => {
  Reflect.deleteProperty(navigator, "serviceWorker");
  vi.clearAllMocks();
});

describe("ServiceWorkerErrorReporter", () => {
  it("reports a service worker error to Sentry, tagged with its context", async () => {
    const Sentry = await import("@sentry/nextjs");
    const serviceWorker = stubServiceWorker();
    render(<ServiceWorkerErrorReporter />);

    serviceWorker.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: SERVICE_WORKER_ERROR_MESSAGE,
          context: "unhandledrejection",
          message: "cache is full",
          stack: "Error: cache is full\n at refreshFeedPageInBackground",
        },
      }),
    );

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [reportedError, captureContext] = vi.mocked(Sentry.captureException).mock.calls[0]!;
    expect(reportedError).toBeInstanceOf(Error);
    expect((reportedError as Error).message).toBe("cache is full");
    expect((reportedError as Error).stack).toContain("refreshFeedPageInBackground");
    expect(captureContext).toEqual({
      tags: { source: "service-worker", context: "unhandledrejection" },
    });
  });

  it("ignores a message that isn't a service worker error report", async () => {
    const Sentry = await import("@sentry/nextjs");
    const serviceWorker = stubServiceWorker();
    render(<ServiceWorkerErrorReporter />);

    serviceWorker.dispatchEvent(
      new MessageEvent("message", { data: { type: "some-other-message" } }),
    );

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("does nothing in a browser with no service worker support", () => {
    Reflect.deleteProperty(navigator, "serviceWorker");

    expect(() => render(<ServiceWorkerErrorReporter />)).not.toThrow();
  });

  it("renders nothing", () => {
    stubServiceWorker();
    const { container } = render(<ServiceWorkerErrorReporter />);

    expect(container).toBeEmptyDOMElement();
  });
});
