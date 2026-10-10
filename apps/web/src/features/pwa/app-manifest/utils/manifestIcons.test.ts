import { describe, expect, it } from "vitest";

import { toManifestIcons } from "./manifestIcons";

describe("toManifestIcons", () => {
  const manifestIcons = toManifestIcons();

  it("includes the 192 and 512 png sizes installability requires", () => {
    const pngSizes = manifestIcons
      .filter(({ type }) => type === "image/png")
      .map(({ sizes }) => sizes);

    expect(pngSizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });

  it("includes a maskable icon so Android does not letterbox the mark", () => {
    expect(manifestIcons.some(({ purpose }) => purpose === "maskable")).toBe(true);
  });

  it("keeps the scalable svg for browsers that prefer it", () => {
    expect(manifestIcons).toContainEqual({
      src: "/logo.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    });
  });
});
