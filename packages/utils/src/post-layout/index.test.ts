import { describe, expect, it } from "vitest";

import { POST_LAYOUT, POST_LAYOUT_ASPECT, POST_LAYOUT_LABEL, POST_LAYOUT_VALUES } from "./index";

describe("post-layout", () => {
  it("keeps POST_LAYOUT's keys and values in sync with POST_LAYOUT_VALUES", () => {
    expect(Object.keys(POST_LAYOUT).sort()).toEqual([...POST_LAYOUT_VALUES].sort());
    for (const layout of POST_LAYOUT_VALUES) {
      expect(POST_LAYOUT[layout]).toBe(layout);
    }
  });

  it("has an aspect ratio and a label for every layout", () => {
    for (const layout of POST_LAYOUT_VALUES) {
      expect(POST_LAYOUT_ASPECT[layout]).toBeGreaterThan(0);
      expect(POST_LAYOUT_LABEL[layout]).toBeTruthy();
    }
  });

  it("defaults PORTRAIT to today's 4:5 ratio so existing posts render unchanged", () => {
    expect(POST_LAYOUT_ASPECT.PORTRAIT).toBeCloseTo(4 / 5);
  });

  it("keeps every layout at or taller than square so masonry columns stay balanced", () => {
    for (const layout of POST_LAYOUT_VALUES) {
      expect(POST_LAYOUT_ASPECT[layout]).toBeLessThanOrEqual(1);
    }
  });
});
