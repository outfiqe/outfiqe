import { describe, expect, it } from "vitest";

import { toOrderTrackingStage } from "./order-tracking.utils.js";

describe("toOrderTrackingStage", () => {
  it("has no stage for an order that was never handed to delivery", () => {
    expect(toOrderTrackingStage([])).toBeNull();
  });

  it("has no stage when the groups were not loaded", () => {
    expect(toOrderTrackingStage(undefined)).toBeNull();
  });
});
