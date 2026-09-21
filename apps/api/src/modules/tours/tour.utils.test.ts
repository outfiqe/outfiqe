import { TourKey } from "@outfiqe/types";
import { describe, expect, it } from "vitest";

import { isKnownTourKey, KNOWN_TOUR_KEYS } from "./tour.utils.js";

describe("isKnownTourKey", () => {
  it("accepts every declared tour key", () => {
    expect(KNOWN_TOUR_KEYS).toContain(TourKey.BRAND_DASHBOARD);
    expect(KNOWN_TOUR_KEYS.every(isKnownTourKey)).toBe(true);
  });

  it("rejects a key that is not declared", () => {
    expect(isKnownTourKey("retired-tour")).toBe(false);
    expect(isKnownTourKey("")).toBe(false);
  });
});
