import { describe, expect, it } from "vitest";

import { createDeliveryZoneSchema, updateDeliveryZoneSchema } from "./delivery-zone.schemas.js";

const validZone = {
  name: "Kathmandu Valley",
  standardDeliveryFee: 100,
  freeDeliveryThreshold: 5000,
  codHandlingFee: 0,
};

describe("createDeliveryZoneSchema", () => {
  it("defaults to the platform country and no delivery days", () => {
    expect(createDeliveryZoneSchema.parse(validZone)).toMatchObject({
      countryCode: "NP",
      minDeliveryDays: null,
      maxDeliveryDays: null,
    });
  });

  it("accepts a delivery-day range", () => {
    expect(
      createDeliveryZoneSchema.safeParse({ ...validZone, minDeliveryDays: 1, maxDeliveryDays: 2 })
        .success,
    ).toBe(true);
  });

  it("rejects a range where the shortest is longer than the longest", () => {
    expect(
      createDeliveryZoneSchema.safeParse({ ...validZone, minDeliveryDays: 3, maxDeliveryDays: 2 })
        .success,
    ).toBe(false);
  });

  it("rejects setting only one end of the range", () => {
    expect(createDeliveryZoneSchema.safeParse({ ...validZone, minDeliveryDays: 1 }).success).toBe(
      false,
    );
  });

  it("rejects a country Outfiqe does not operate in", () => {
    expect(createDeliveryZoneSchema.safeParse({ ...validZone, countryCode: "US" }).success).toBe(
      false,
    );
  });
});

describe("updateDeliveryZoneSchema", () => {
  it("accepts an update that leaves the delivery days alone", () => {
    expect(updateDeliveryZoneSchema.safeParse({ name: "Valley" }).success).toBe(true);
  });

  it("accepts clearing both delivery days", () => {
    expect(
      updateDeliveryZoneSchema.safeParse({ minDeliveryDays: null, maxDeliveryDays: null }).success,
    ).toBe(true);
  });

  it("rejects clearing only one delivery day", () => {
    expect(
      updateDeliveryZoneSchema.safeParse({ minDeliveryDays: null, maxDeliveryDays: 2 }).success,
    ).toBe(false);
  });
});
