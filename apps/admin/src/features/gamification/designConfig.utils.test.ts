import { describe, expect, it } from "vitest";

import {
  isStudioDesignConfig,
  legacyImageUrlOf,
  legacyShapeAndColorOf,
  studioLayersOf,
} from "./designConfig.utils";
import type { BadgeDesignConfig, BadgeLayer } from "./schemas";

const legacyConfig: BadgeDesignConfig = { shape: "star", primaryColor: "#ff0000" };

const layers: BadgeLayer[] = [
  {
    id: "bg",
    type: "background",
    shape: "circle",
    fill: "#123456",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  },
];
const studioConfig: BadgeDesignConfig = { version: 2, layers };

describe("isStudioDesignConfig", () => {
  it("returns false for a legacy design config", () => {
    expect(isStudioDesignConfig(legacyConfig)).toBe(false);
  });

  it("returns true for a studio design config", () => {
    expect(isStudioDesignConfig(studioConfig)).toBe(true);
  });
});

describe("legacyShapeAndColorOf", () => {
  it("returns the real shape and color for a legacy design config", () => {
    expect(legacyShapeAndColorOf(legacyConfig)).toEqual({ shape: "star", primaryColor: "#ff0000" });
  });

  it("returns a sensible fallback for a studio design config", () => {
    const { shape, primaryColor } = legacyShapeAndColorOf(studioConfig);
    expect(shape).toBeTruthy();
    expect(primaryColor).toMatch(/^#/);
  });
});

describe("studioLayersOf", () => {
  it("returns an empty array for a legacy design config", () => {
    expect(studioLayersOf(legacyConfig)).toEqual([]);
  });

  it("returns the layers for a studio design config", () => {
    expect(studioLayersOf(studioConfig)).toBe(layers);
  });
});

describe("legacyImageUrlOf", () => {
  it("returns the imageUrl from a legacy design config", () => {
    expect(
      legacyImageUrlOf({ shape: "circle", primaryColor: "#000", imageUrl: "https://cdn/i.png" }),
    ).toBe("https://cdn/i.png");
  });

  it("returns an empty string for a legacy config with no imageUrl or a studio config", () => {
    expect(legacyImageUrlOf(legacyConfig)).toBe("");
    expect(legacyImageUrlOf(studioConfig)).toBe("");
  });
});
