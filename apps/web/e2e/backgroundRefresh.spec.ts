import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 60_000;

const waitUntilServiceWorkerControlsPage = (page: Page) =>
  page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: SERVICE_WORKER_ACTIVATION_TIMEOUT_MS,
  });

const attemptBackgroundRefreshRegistration = async () => {
  try {
    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });

    if (status.state !== "granted") return { registered: false, threw: false };

    const registration = await navigator.serviceWorker.ready;
    if (!registration.periodicSync) return { registered: false, threw: false };

    await registration.periodicSync.register("refresh-feed", { minInterval: 1 });
    return { registered: true, threw: false };
  } catch {
    return { registered: false, threw: true };
  }
};

test.describe("background refresh", () => {
  test("registering periodic background sync never crashes the page, even where the feature is unsupported", async ({
    page,
  }) => {
    test.slow();

    await page.goto("/offline");
    await waitUntilServiceWorkerControlsPage(page);

    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const result = await page.evaluate(attemptBackgroundRefreshRegistration);

    expect(result.registered).toBe(false);
    expect(pageErrors).toHaveLength(0);
  });
});
