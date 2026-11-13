import { describe, expect, it } from "vitest";

import type { DeliveryZone } from "@/features/delivery-zones";

import { summarizeDeliveryFees } from "./summarizeDeliveryFees";

const buildZone = (overrides: Partial<DeliveryZone>): DeliveryZone => ({
  id: "z1",
  name: "Default zone",
  isDefault: true,
  cities: [],
  standardDeliveryFee: 150,
  freeDeliveryThreshold: 5000,
  codHandlingFee: 50,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("summarizeDeliveryFees", () => {
  it("quotes the lowest fee and the free-delivery amount every zone shares", () => {
    const summary = summarizeDeliveryFees([
      buildZone({}),
      buildZone({ id: "z2", isDefault: false, standardDeliveryFee: 100 }),
    ]);

    expect(summary).toEqual({ lowestFee: 100, sharedFreeDeliveryThreshold: 5000 });
  });

  it("leaves out the free-delivery amount when zones disagree on it", () => {
    const summary = summarizeDeliveryFees([
      buildZone({}),
      buildZone({ id: "z2", freeDeliveryThreshold: 3000 }),
    ]);

    expect(summary?.sharedFreeDeliveryThreshold).toBeNull();
  });

  it("leaves out the free-delivery amount when there is none", () => {
    expect(summarizeDeliveryFees([buildZone({ freeDeliveryThreshold: 0 })])).toEqual({
      lowestFee: 150,
      sharedFreeDeliveryThreshold: null,
    });
  });

  it("returns nothing when no zones are set up", () => {
    expect(summarizeDeliveryFees([])).toBeNull();
  });
});
