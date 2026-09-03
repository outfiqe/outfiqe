import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("manifest", () => {
  const webManifest = manifest();

  it("declares the fields a browser requires before offering installation", () => {
    expect(webManifest).toMatchObject({
      name: expect.stringContaining("Outfiqe"),
      short_name: "Outfiqe",
      display: "standalone",
      scope: "/",
      background_color: expect.stringMatching(/^#/),
      theme_color: expect.stringMatching(/^#/),
    });
    expect(webManifest.start_url).toMatch(/^\//);
  });

  it("keeps a stable app id so the start_url can carry an install source", () => {
    expect(webManifest.id).toBe("/");
    expect(webManifest.start_url).not.toBe(webManifest.id);
  });

  it("exposes shortcuts that point at real in-scope routes", () => {
    const shortcutUrls = (webManifest.shortcuts ?? []).map(({ url }) => url);

    expect(shortcutUrls.length).toBeGreaterThan(0);
    shortcutUrls.forEach((shortcutUrl) => expect(shortcutUrl).toMatch(/^\//));
  });

  it("ships both an any and a maskable icon", () => {
    const iconPurposes = (webManifest.icons ?? []).map(({ purpose }) => purpose);

    expect(iconPurposes).toContain("any");
    expect(iconPurposes).toContain("maskable");
  });
});
