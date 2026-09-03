import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 60_000;

const waitUntilServiceWorkerControlsPage = (page: Page) =>
  page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: SERVICE_WORKER_ACTIVATION_TIMEOUT_MS,
  });

test.describe("service worker", () => {
  test("is served with a root scope so it can control every page", async ({ request }) => {
    const serviceWorkerResponse = await request.get("/serwist/sw.js");

    expect(serviceWorkerResponse.status()).toBe(200);
    expect(serviceWorkerResponse.headers()["service-worker-allowed"]).toBe("/");
    expect(serviceWorkerResponse.headers()["content-type"]).toContain("javascript");
  });

  test("precaches the offline page so the fallback works with no network", async ({ request }) => {
    const serviceWorkerSource = await (await request.get("/serwist/sw.js")).text();

    expect(serviceWorkerSource).toContain("/offline");
  });

  test("registers and takes control of the page", async ({ page }) => {
    await page.goto("/offline");
    await waitUntilServiceWorkerControlsPage(page);

    const isControlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);
    expect(isControlled).toBe(true);
  });

  test("caches pages it has served so they survive losing the network", async ({ page }) => {
    await page.goto("/offline");
    await waitUntilServiceWorkerControlsPage(page);
    await page.goto("/about", { waitUntil: "load" });

    await expect
      .poll(() => page.evaluate(() => caches.keys()), { timeout: 15_000 })
      .toContain("visited-pages");
  });
});
