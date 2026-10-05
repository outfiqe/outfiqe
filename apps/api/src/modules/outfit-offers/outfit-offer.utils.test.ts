import { describe, expect, it } from "vitest";

import { deadlineAfterDays, isAmountInRange, toStoredJson } from "./outfit-offer.utils.js";

describe("isAmountInRange", () => {
  it("accepts amounts on and between the limits, and nothing outside them", () => {
    expect(isAmountInRange(500, 500, 1_000)).toBe(true);
    expect(isAmountInRange(1_000, 500, 1_000)).toBe(true);
    expect(isAmountInRange(499, 500, 1_000)).toBe(false);
    expect(isAmountInRange(1_001, 500, 1_000)).toBe(false);
  });
});

describe("deadlineAfterDays", () => {
  it("counts whole days from the moment given", () => {
    const sentAt = new Date("2026-10-01T10:00:00.000Z");
    expect(deadlineAfterDays(sentAt, 3).toISOString()).toBe("2026-10-04T10:00:00.000Z");
  });
});

describe("toStoredJson", () => {
  it("keeps a gateway's JSON answer as it is", () => {
    expect(toStoredJson({ status: "Completed", amount: 500 })).toEqual({
      status: "Completed",
      amount: 500,
    });
  });

  it("stores a marker instead of nothing, or of something that isn't JSON", () => {
    expect(toStoredJson(null)).toEqual({ unreadableResponse: true });
    expect(toStoredJson(undefined)).toEqual({ unreadableResponse: true });
    expect(toStoredJson(() => "not json")).toEqual({ unreadableResponse: true });
  });
});
