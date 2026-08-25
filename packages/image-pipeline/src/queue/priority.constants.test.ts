import { describe, expect, it } from "vitest";

import { priorityValueForTier } from "./priority.constants.js";

describe("priorityValueForTier", () => {
  it("ranks paidCreator above standard, and standard above bulkAdmin", () => {
    const paidCreator = priorityValueForTier("paidCreator");
    const standard = priorityValueForTier("standard");
    const bulkAdmin = priorityValueForTier("bulkAdmin");

    expect(paidCreator).toBeLessThan(standard);
    expect(standard).toBeLessThan(bulkAdmin);
  });
});
