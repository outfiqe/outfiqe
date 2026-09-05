import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const SHARE_TARGET_PATH = "/share-target";

const SHARED_PHOTO_CACHE_NAME = "shared-photo";

const SHARED_PHOTO_CACHE_URL = "/__shared-photo";

const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 60_000;

const waitUntilServiceWorkerControlsPage = (page: Page) =>
  page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: SERVICE_WORKER_ACTIVATION_TIMEOUT_MS,
  });

const submitSharedPhoto = async ({
  path,
  cacheName,
  cacheUrl,
}: {
  path: string;
  cacheName: string;
  cacheUrl: string;
}) => {
  const formData = new FormData();
  formData.append("photos", new File(["fake-image-bytes"], "shared.jpg", { type: "image/jpeg" }));

  const response = await fetch(path, { method: "POST", body: formData, redirect: "manual" });

  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(cacheUrl);

  return {
    responseType: response.type,
    hasCachedPhoto: cachedResponse !== undefined,
    cachedType: cachedResponse?.headers.get("Content-Type") ?? null,
    cachedByteLength: cachedResponse ? (await cachedResponse.arrayBuffer()).byteLength : 0,
  };
};

test.describe("share target", () => {
  test("the service worker stashes a shared photo in cache storage and redirects to the compose page", async ({
    page,
  }) => {
    test.slow();

    await page.goto("/offline");
    await waitUntilServiceWorkerControlsPage(page);
    await page.goto("/");

    const result = await page.evaluate(submitSharedPhoto, {
      path: SHARE_TARGET_PATH,
      cacheName: SHARED_PHOTO_CACHE_NAME,
      cacheUrl: SHARED_PHOTO_CACHE_URL,
    });

    expect(result.responseType).toBe("opaqueredirect");
    expect(result.hasCachedPhoto).toBe(true);
    expect(result.cachedType).toBe("image/jpeg");
    expect(result.cachedByteLength).toBeGreaterThan(0);
  });

  test("a submission with no photo redirects without stashing anything", async ({ page }) => {
    test.slow();

    await page.goto("/offline");
    await waitUntilServiceWorkerControlsPage(page);
    await page.goto("/");

    const result = await page.evaluate(
      async ({ path, cacheName, cacheUrl }) => {
        const formData = new FormData();
        formData.append("text", "Sharing a link, no photo this time");

        const response = await fetch(path, { method: "POST", body: formData, redirect: "manual" });
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(cacheUrl);
        return { responseType: response.type, hasCachedPhoto: cachedResponse !== undefined };
      },
      {
        path: SHARE_TARGET_PATH,
        cacheName: SHARED_PHOTO_CACHE_NAME,
        cacheUrl: SHARED_PHOTO_CACHE_URL,
      },
    );

    expect(result.responseType).toBe("opaqueredirect");
    expect(result.hasCachedPhoto).toBe(false);
  });
});
