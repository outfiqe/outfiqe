import { describe, expect, it } from "vitest";

import { canTransitionTagReview } from "./tag-review.utils.js";

describe("canTransitionTagReview", () => {
  it("allows the brand-review and re-request edges", () => {
    expect(canTransitionTagReview("PENDING", "APPROVED")).toBe(true);
    expect(canTransitionTagReview("PENDING", "REJECTED")).toBe(true);
    expect(canTransitionTagReview("APPROVED", "REJECTED")).toBe(true);
    expect(canTransitionTagReview("REJECTED", "PENDING")).toBe(true);
  });

  it("rejects re-approving without a brand action and other invalid edges", () => {
    expect(canTransitionTagReview("APPROVED", "PENDING")).toBe(false);
    expect(canTransitionTagReview("REJECTED", "APPROVED")).toBe(false);
    expect(canTransitionTagReview("PENDING", "PENDING")).toBe(false);
  });
});
