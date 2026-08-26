import { describe, expect, it } from "vitest";

import { shouldMoveToDeadLetter } from "./dead-letter.js";

describe("shouldMoveToDeadLetter", () => {
  it("returns false while attempts remain", () => {
    expect(shouldMoveToDeadLetter(2, 5)).toBe(false);
  });

  it("returns true once attemptsMade reaches maxAttempts", () => {
    expect(shouldMoveToDeadLetter(5, 5)).toBe(true);
  });

  it("returns true if attemptsMade somehow exceeds maxAttempts", () => {
    expect(shouldMoveToDeadLetter(6, 5)).toBe(true);
  });
});
