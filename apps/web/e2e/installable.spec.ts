import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 60_000;

const waitUntilServiceWorkerControlsPage = (page: Page) =>
  page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: SERVICE_WORKER_ACTIVATION_TIMEOUT_MS,
  });

type ManifestIcon = { src: string; sizes?: string; purpose?: string };

test.describe("installability contract", () => {
  test("the manifest still carries everything a browser checks before offering to install", async ({
    request,
  }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toMatch(/^\//);
    expect(manifest.scope).toBe("/");

    const displays = [manifest.display, ...(manifest.display_override ?? [])];
    expect(displays).toEqual(
      expect.arrayContaining([expect.stringMatching(/standalone|fullscreen|minimal-ui/)]),
    );

    const iconSizes = (manifest.icons as ManifestIcon[]).flatMap((icon) =>
      (icon.sizes ?? "").split(/\s+/),
    );
    expect(iconSizes).toContain("192x192");
    expect(iconSizes).toContain("512x512");
  });

  test("both required icon sizes are actually reachable, not just declared", async ({
    request,
  }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();

    for (const requiredSize of ["192x192", "512x512"]) {
      const icon = (manifest.icons as ManifestIcon[]).find((candidate) =>
        (candidate.sizes ?? "").split(/\s+/).includes(requiredSize),
      );
      expect(icon, `an icon declaring ${requiredSize}`).toBeDefined();

      const iconResponse = await request.get(icon!.src);
      expect(iconResponse.status()).toBe(200);
      expect(iconResponse.headers()["content-type"]).toContain("image/png");
    }
  });

  test("a service worker registers and takes control, so the browser sees an installable app", async ({
    page,
  }) => {
    await page.goto("/offline");
    await waitUntilServiceWorkerControlsPage(page);

    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  });

  test("every screenshot the manifest advertises is actually served", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();

    for (const screenshot of (manifest.screenshots ?? []) as { src: string }[]) {
      const screenshotResponse = await request.get(screenshot.src);
      expect(screenshotResponse.status(), screenshot.src).toBe(200);
    }
  });
});
