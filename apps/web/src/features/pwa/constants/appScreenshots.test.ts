import { describe, expect, it } from "vitest";

import { appScreenshotPath, appScreenshots, SCREENSHOT_DIRECTORY } from "./appScreenshots";

describe("app screenshots", () => {
  it("covers both a narrow and a wide form factor for the Android install dialog", () => {
    const formFactors = new Set(appScreenshots.map((screenshot) => screenshot.formFactor));

    expect(formFactors).toContain("narrow");
    expect(formFactors).toContain("wide");
  });

  it("gives every screenshot a route, a WxH size string, and a human label", () => {
    appScreenshots.forEach((screenshot) => {
      expect(screenshot.route).toMatch(/^\//);
      expect(screenshot.size).toMatch(/^\d+x\d+$/);
      expect(screenshot.label.length).toBeGreaterThan(0);
      expect(screenshot.fileName).toMatch(/\.png$/);
    });
  });

  it("builds a public path under the screenshots directory", () => {
    expect(appScreenshotPath("home-narrow.png")).toBe(`${SCREENSHOT_DIRECTORY}/home-narrow.png`);
  });
});
