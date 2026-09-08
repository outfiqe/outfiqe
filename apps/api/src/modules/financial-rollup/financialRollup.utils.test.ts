import { describe, expect, it } from "vitest";

import { sumStatusBuckets } from "./financialRollup.utils.js";

describe("sumStatusBuckets", () => {
  it("adds up only the requested statuses and treats a missing bucket as zero", () => {
    const byStatus = { PENDING: 100, AVAILABLE: 40, PAID: 9000, VOIDED: 7 };

    expect(sumStatusBuckets(byStatus, ["PENDING", "AVAILABLE"])).toBe(140);
    expect(sumStatusBuckets(byStatus, ["PENDING", "APPROVED", "AVAILABLE"])).toBe(140);
  });

  it("returns zero when nothing matches", () => {
    expect(sumStatusBuckets({}, ["PENDING"])).toBe(0);
    expect(sumStatusBuckets({ PAID: 500 }, ["PENDING", "AVAILABLE"])).toBe(0);
  });
});
