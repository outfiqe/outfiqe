import { describe, expect, it } from "vitest";

import {
  CROCKFORD_BASE32_ALPHABET,
  describeFixedTextPatternProblem,
  formatParcelCode,
  isCrockfordCode,
  isFixedTextPattern,
  normalizeParcelCode,
  normalizeTypedCode,
  PICKUP_CODE_LENGTH,
  suggestReferencePattern,
} from "./index";

describe("isFixedTextPattern", () => {
  it("flags a pattern with no part that can change", () => {
    expect(isFixedTextPattern("SANSAR-")).toBe(true);
    expect(isFixedTextPattern("PX")).toBe(true);
  });

  it("accepts a pattern with a part that changes", () => {
    expect(isFixedTextPattern("SANSAR-\\d+")).toBe(false);
    expect(isFixedTextPattern("PX-[0-9]{5}")).toBe(false);
    expect(isFixedTextPattern("NCM.*")).toBe(false);
  });
});

describe("suggestReferencePattern", () => {
  it("suggests the fixed text followed by digits", () => {
    expect(suggestReferencePattern("SANSAR-")).toBe("SANSAR-\\d+");
  });
});

describe("describeFixedTextPatternProblem", () => {
  it("names the pattern and suggests one built from it", () => {
    expect(describeFixedTextPatternProblem("SANSAR-")).toBe(
      '"SANSAR-" only matches that exact text, so every real parcel number would be refused. Add the part that changes, for example SANSAR-\\d+ for "SANSAR-" followed by digits.',
    );
  });
});

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

describe("normalizeParcelCode", () => {
  it("accepts our parcel code typed with dashes, spaces, lower case or a zero for the O", () => {
    expect(normalizeParcelCode("OFQ-7K2M-9QAB")).toBe("OFQ7K2M9QAB");
    expect(normalizeParcelCode(" ofq 7k2m 9qab ")).toBe("OFQ7K2M9QAB");
    expect(normalizeParcelCode("0FQ7K2M9QAB")).toBe("OFQ7K2M9QAB");
  });

  it("rejects codes that aren't parcel codes", () => {
    expect(normalizeParcelCode("7K2M9QAB")).toBeNull();
    expect(normalizeParcelCode("OFQ7K2M9QA")).toBeNull();
    expect(normalizeParcelCode("PX-55821")).toBeNull();
  });
});

describe("formatParcelCode", () => {
  it("groups the code so it is easy to read out", () => {
    expect(formatParcelCode("OFQ7K2M9QAB")).toBe("OFQ-7K2M-9QAB");
  });
});
