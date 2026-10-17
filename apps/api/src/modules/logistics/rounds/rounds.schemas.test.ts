import { describe, expect, it } from "vitest";

import { assignRiderTaskSchema, collectScanSchema } from "./rounds.schemas.js";

const SCANNED_AT = "2026-10-16T08:00:00.000Z";
const GROUP_ID = "6f1d2c1e-4b8a-4b8e-9d55-2b9a0f3c7e11";

describe("collectScanSchema", () => {
  it("tidies hand-typed codes before checking them", () => {
    const parsed = collectScanSchema.parse({
      pickupCode: "7k2m-9qab",
      bagTagCode: "abcd efgh jk",
      scannedAt: SCANNED_AT,
    });

    expect(parsed).toEqual({
      pickupCode: "7K2M9QAB",
      bagTagCode: "ABCDEFGHJK",
      scannedAt: new Date(SCANNED_AT),
    });
  });

  it("rejects a code with the wrong length", () => {
    expect(
      collectScanSchema.safeParse({
        pickupCode: "7K2M9QA",
        bagTagCode: "ABCDEFGHJK",
        scannedAt: SCANNED_AT,
      }).success,
    ).toBe(false);
  });
});

describe("assignRiderTaskSchema", () => {
  it("rejects the same pickup listed twice", () => {
    expect(
      assignRiderTaskSchema.safeParse({
        riderId: GROUP_ID,
        pickupLocationId: GROUP_ID,
        fulfilmentGroupIds: [GROUP_ID, GROUP_ID],
        roundStartsAt: SCANNED_AT,
      }).success,
    ).toBe(false);
  });
});
