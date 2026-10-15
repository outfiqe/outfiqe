import { describe, expect, it } from "vitest";

import {
  CROCKFORD_BASE32_ALPHABET,
  isCrockfordCode,
  normalizeTypedCode,
  PICKUP_CODE_LENGTH,
} from "./index";

describe("normalizeTypedCode", () => {
  it("upper-cases and removes spaces and dashes", () => {
    expect(normalizeTypedCode(" 7k2m-9q ab ")).toBe("7K2M9QAB");
  });

  it("reads the letters people confuse with digits as those digits", () => {
    expect(normalizeTypedCode("oIl0")).toBe("0110");
  });
});

describe("isCrockfordCode", () => {
  it("accepts a code of the right length made only of alphabet characters", () => {
    expect(isCrockfordCode("7K2M9QAB", PICKUP_CODE_LENGTH)).toBe(true);
  });

  it("rejects a code of the wrong length", () => {
    expect(isCrockfordCode("7K2M9QA", PICKUP_CODE_LENGTH)).toBe(false);
  });

  it("rejects letters left out of the alphabet", () => {
    expect(isCrockfordCode("7K2M9QAU", PICKUP_CODE_LENGTH)).toBe(false);
  });

  it("has no letters that look like digits in its alphabet", () => {
    expect(CROCKFORD_BASE32_ALPHABET).not.toMatch(/[ILOU]/);
  });
});
