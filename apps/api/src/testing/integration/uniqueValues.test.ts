import { describe, expect, it } from "vitest";

import { uniquePhone } from "./uniqueValues.js";

describe("uniquePhone", () => {
  it("looks like a valid Nepali phone number", () => {
    expect(uniquePhone()).toMatch(/^98\d{8}$/);
  });

  it("never repeats across many calls in the same process", () => {
    const CALL_COUNT = 5000;
    const phones = new Set(Array.from({ length: CALL_COUNT }, () => uniquePhone()));

    expect(phones.size).toBe(CALL_COUNT);
  });
});
