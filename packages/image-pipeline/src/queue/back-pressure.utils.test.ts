import { describe, expect, it } from "vitest";

import { checkBackPressure, totalQueueDepth } from "./back-pressure.utils.js";

describe("totalQueueDepth", () => {
  it("sums waiting, active, and delayed counts", () => {
    expect(totalQueueDepth({ waiting: 10, active: 5, delayed: 2 })).toBe(17);
  });
});

describe("checkBackPressure", () => {
  it("allows enqueueing when depth is below the threshold", () => {
    const decision = checkBackPressure({ waiting: 10, active: 5, delayed: 0 }, 500, 30);
    expect(decision).toEqual({ allowed: true });
  });

  it("rejects with a retryAfterSeconds when depth meets the threshold", () => {
    const decision = checkBackPressure({ waiting: 300, active: 200, delayed: 0 }, 500, 30);
    expect(decision).toEqual({ allowed: false, retryAfterSeconds: 30 });
  });

  it("rejects when depth exceeds the threshold", () => {
    const decision = checkBackPressure({ waiting: 1000, active: 0, delayed: 0 }, 500, 15);
    expect(decision).toEqual({ allowed: false, retryAfterSeconds: 15 });
  });

  it("treats the boundary (depth exactly equal to threshold) as rejected", () => {
    const decision = checkBackPressure({ waiting: 499, active: 1, delayed: 0 }, 500, 10);
    expect(decision.allowed).toBe(false);
  });
});
