import { expect, test } from "@playwright/test";

test.describe("web app manifest", () => {
  test("is served with the fields a browser needs before it will offer to install the app", async ({
    request,
  }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);

    const manifest = await response.json();

    expect(manifest.name).toContain("Outfiqe");
    expect(manifest.short_name).toBe("Outfiqe");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toMatch(/^\//);
    expect(manifest.scope).toBe("/");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("lists both an any and a maskable icon, both actually reachable", async ({ request }) => {
    const manifestResponse = await request.get("/manifest.webmanifest");
    const manifest = await manifestResponse.json();

    const anyIcon = manifest.icons.find(
      (icon: { purpose?: string; type?: string }) =>
        icon.purpose === "any" && icon.type === "image/png",
    );
    const maskableIcon = manifest.icons.find(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    );
    expect(anyIcon).toBeDefined();
    expect(maskableIcon).toBeDefined();

    const anyIconResponse = await request.get(anyIcon.src);
    const maskableIconResponse = await request.get(maskableIcon.src);
    expect(anyIconResponse.status()).toBe(200);
    expect(anyIconResponse.headers()["content-type"]).toContain("image/png");
    expect(maskableIconResponse.status()).toBe(200);
  });

  test("every shortcut points at a route that actually resolves", async ({ request }) => {
    const manifestResponse = await request.get("/manifest.webmanifest");
    const manifest = await manifestResponse.json();

    expect(manifest.shortcuts.length).toBeGreaterThan(0);

    for (const shortcut of manifest.shortcuts as { url: string }[]) {
      const response = await request.get(shortcut.url, { maxRedirects: 0 });
      expect([200, 307, 308]).toContain(response.status());
    }
  });

  test("the apple touch icon referenced in the page head is actually reachable", async ({
    page,
  }) => {
    await page.goto("/offline");

    const appleTouchIconHref = await page
      .locator('link[rel="apple-touch-icon"]')
      .first()
      .getAttribute("href");
    expect(appleTouchIconHref).toBeTruthy();

    const response = await page.request.get(appleTouchIconHref!);
    expect(response.status()).toBe(200);
  });

  test("the iPhone launch image for at least one real device size is reachable", async ({
    page,
  }) => {
    await page.goto("/offline");

    const splashHref = await page
      .locator('link[rel="apple-touch-startup-image"]')
      .first()
      .getAttribute("href");
    expect(splashHref).toMatch(/^\/splash\/splash-\d+x\d+@\dx\.png$/);

    const response = await page.request.get(splashHref!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });
});
