import { describe, expect, it } from "vitest";

import type { DeliveryZone } from "../api/deliveryZoneSchemas";
import { isListedCity, resolveZonePreview } from "./resolveZonePreview";

const buildZone = (overrides: Partial<DeliveryZone>): DeliveryZone => ({
  id: "zone-1",
  name: "Kathmandu Valley",
  isDefault: false,
  cities: ["Kathmandu", "Lalitpur"],
  standardDeliveryFee: 100,
  freeDeliveryThreshold: 5000,
  codHandlingFee: 50,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const VALLEY_ZONE = buildZone({});
const DEFAULT_ZONE = buildZone({
  id: "zone-default",
  name: "Everywhere else",
  isDefault: true,
  cities: ["Pokhara"],
  standardDeliveryFee: 150,
});

describe("isListedCity", () => {
  it("recognises a listed city whatever its letter case or spacing", () => {
    expect(isListedCity([VALLEY_ZONE, DEFAULT_ZONE], "  LALITPUR ")).toBe(true);
    expect(isListedCity([VALLEY_ZONE, DEFAULT_ZONE], "Pokhara")).toBe(true);
  });

  it("rejects a city no zone lists", () => {
    expect(isListedCity([VALLEY_ZONE, DEFAULT_ZONE], "sfasd")).toBe(false);
  });
});

describe("resolveZonePreview", () => {
  it("returns the zone that lists the city", () => {
    expect(resolveZonePreview([VALLEY_ZONE, DEFAULT_ZONE], "kathmandu")).toBe(VALLEY_ZONE);
  });

  it("falls back to the default zone when no city is given", () => {
    expect(resolveZonePreview([VALLEY_ZONE, DEFAULT_ZONE], "")).toBe(DEFAULT_ZONE);
  });
});
