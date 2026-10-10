import { describe, expect, it } from "vitest";

import { appIconFileName, appIconPath, installAppIcons } from "./appIcons";

describe("installAppIcons", () => {
  it("covers both install sizes in both purposes", () => {
    expect(installAppIcons).toEqual(
      expect.arrayContaining([
        { size: 192, purpose: "any" },
        { size: 192, purpose: "maskable" },
        { size: 512, purpose: "any" },
        { size: 512, purpose: "maskable" },
      ]),
    );
  });

  it("declares a unique file per descriptor", () => {
    const fileNames = installAppIcons.map(appIconFileName);

    expect(new Set(fileNames).size).toBe(installAppIcons.length);
  });
});

describe("appIconPath", () => {
  it("resolves into the served icon directory as a png", () => {
    expect(appIconPath({ size: 512, purpose: "maskable" })).toBe("/icons/icon-512-maskable.png");
  });
});
