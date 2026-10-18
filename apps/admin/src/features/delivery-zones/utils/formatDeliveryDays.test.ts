import { describe, expect, it } from "vitest";

import { formatDeliveryDays } from "./formatDeliveryDays";

describe("formatDeliveryDays", () => {
  it("shows a range of working days", () => {
    expect(formatDeliveryDays({ minDeliveryDays: 1, maxDeliveryDays: 2 })).toBe(
      " · 1–2 working days",
    );
  });

  it("shows a single number when both ends match", () => {
    expect(formatDeliveryDays({ minDeliveryDays: 3, maxDeliveryDays: 3 })).toBe(
      " · 3 working days",
    );
  });

  it("says when the zone has no estimate", () => {
    expect(formatDeliveryDays({ minDeliveryDays: null, maxDeliveryDays: null })).toBe(
      " · no delivery estimate",
    );
  });
});
