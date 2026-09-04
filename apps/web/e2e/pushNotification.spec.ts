import type { CDPSession, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 60_000;

const REGISTRATION_LOOKUP_TIMEOUT_MS = 20_000;

const REGISTRATION_POLL_INTERVAL_MS = 250;

const WORKER_ERROR_WAIT_MS = 5_000;

const EXPECTED_PERMISSION_ERROR =
  "Failed to execute 'showNotification' on 'ServiceWorkerRegistration': No notification permission has been granted for this origin.";

type ServiceWorkerRegistrationSummary = {
  registrationId: string;
  scopeURL: string;
  isDeleted: boolean;
};

type WorkerErrorReportedEvent = {
  errorMessage: { errorMessage: string; sourceURL: string };
};

const waitUntilServiceWorkerControlsPage = (page: Page) =>
  page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: SERVICE_WORKER_ACTIVATION_TIMEOUT_MS,
  });

const findServiceWorkerRegistrationId = async (
  devtools: CDPSession,
  scopeOrigin: string,
): Promise<string> => {
  let registrationId: string | undefined;

  devtools.on("ServiceWorker.workerRegistrationUpdated", (event) => {
    const registrations = event.registrations as ServiceWorkerRegistrationSummary[];
    const live = registrations.find(
      (registration) => !registration.isDeleted && registration.scopeURL.startsWith(scopeOrigin),
    );
    if (live) registrationId = live.registrationId;
  });

  await devtools.send("ServiceWorker.enable");

  const deadline = Date.now() + REGISTRATION_LOOKUP_TIMEOUT_MS;
  while (!registrationId && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, REGISTRATION_POLL_INTERVAL_MS));
  }

  if (!registrationId) throw new Error("No service worker registration was reported over CDP");
  return registrationId;
};

const deliverPushAndCaptureError = async (
  devtools: CDPSession,
  origin: string,
  registrationId: string,
  data: string,
): Promise<string> => {
  const errorPromise = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for the push handler to run")),
      WORKER_ERROR_WAIT_MS,
    );
    devtools.on("ServiceWorker.workerErrorReported", (rawEvent) => {
      const event = rawEvent as WorkerErrorReportedEvent;
      clearTimeout(timer);
      resolve(event.errorMessage.errorMessage);
    });
  });

  await devtools.send("ServiceWorker.deliverPushMessage", { origin, registrationId, data });

  return errorPromise;
};

test.describe("push notifications", () => {
  test("the push handler runs and reaches the browser's own permission gate, proving it parsed a well-formed payload without throwing first", async ({
    page,
    context,
    baseURL,
  }) => {
    test.slow();

    const origin = new URL(baseURL ?? "http://127.0.0.1:3100").origin;

    await page.goto("/offline");
    await waitUntilServiceWorkerControlsPage(page);

    const devtools = await context.newCDPSession(page);
    const registrationId = await findServiceWorkerRegistrationId(devtools, origin);

    const errorMessage = await deliverPushAndCaptureError(
      devtools,
      origin,
      registrationId,
      JSON.stringify({
        title: "New like",
        body: "Someone liked your look",
        url: "/profile",
        tag: "LOOK_LIKED:look-1",
      }),
    );

    expect(errorMessage).toContain(EXPECTED_PERMISSION_ERROR);
  });

  test("a malformed push payload still reaches the same permission gate instead of throwing its own error", async ({
    page,
    context,
    baseURL,
  }) => {
    test.slow();

    const origin = new URL(baseURL ?? "http://127.0.0.1:3100").origin;

    await page.goto("/offline");
    await waitUntilServiceWorkerControlsPage(page);

    const devtools = await context.newCDPSession(page);
    const registrationId = await findServiceWorkerRegistrationId(devtools, origin);

    const errorMessage = await deliverPushAndCaptureError(
      devtools,
      origin,
      registrationId,
      "this is not json",
    );

    expect(errorMessage).toContain(EXPECTED_PERMISSION_ERROR);
  });
});
