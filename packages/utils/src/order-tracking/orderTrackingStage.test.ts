import { describe, expect, it } from "vitest";

import {
  isOrderTrackingStage,
  ORDER_TRACKING_STAGE_MESSAGES,
  OrderTrackingStage,
} from "./orderTrackingStage";

describe("order tracking stages", () => {
  it("has a customer message for every stage", () => {
    for (const stage of Object.values(OrderTrackingStage)) {
      expect(ORDER_TRACKING_STAGE_MESSAGES[stage]).toMatch(/\S/);
    }
  });

  it("recognises a stage and nothing else", () => {
    expect(isOrderTrackingStage("OUT_FOR_DELIVERY")).toBe(true);
    expect(isOrderTrackingStage("SHIPPED")).toBe(false);
    expect(isOrderTrackingStage(undefined)).toBe(false);
  });
});
