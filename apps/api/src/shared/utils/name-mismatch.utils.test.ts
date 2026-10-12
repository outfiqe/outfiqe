import { describe, expect, it } from "vitest";

import { isNameMismatch, isSameNameIgnoringWordOrder } from "./name-mismatch.utils.js";

describe("isNameMismatch", () => {
  it("ignores case and extra spaces", () => {
    expect(isNameMismatch("  Ram   SHARMA ", "ram sharma")).toBe(false);
  });

  it("flags a different name", () => {
    expect(isNameMismatch("Ram Sharma", "Sita Sharma")).toBe(true);
  });
});

describe("isSameNameIgnoringWordOrder", () => {
  it("matches the same words in a different order", () => {
    expect(isSameNameIgnoringWordOrder("SHARMA RAM", "Ram Sharma")).toBe(true);
  });

  it("ignores dots and commas between words", () => {
    expect(isSameNameIgnoringWordOrder("Sharma, Ram B.", "ram b sharma")).toBe(true);
  });

  it("does not match when a word is missing", () => {
    expect(isSameNameIgnoringWordOrder("Ram Bahadur Sharma", "Ram Sharma")).toBe(false);
  });

  it("does not match a different name", () => {
    expect(isSameNameIgnoringWordOrder("Ram Sharma", "Hari Sharma")).toBe(false);
  });
});
