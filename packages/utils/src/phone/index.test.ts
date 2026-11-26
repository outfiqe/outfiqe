import { describe, expect, it } from "vitest";

import { NEPAL_PHONE_REGEX, stripPhoneSeparators } from "./index";

describe("stripPhoneSeparators", () => {
  it("removes spaces and dashes", () => {
    expect(stripPhoneSeparators("98 200-00000")).toBe("9820000000");
  });
});

describe("NEPAL_PHONE_REGEX", () => {
  it("accepts ten digits starting with 98", () => {
    expect(NEPAL_PHONE_REGEX.test("9820000000")).toBe(true);
  });

  it("rejects short numbers, wrong prefixes and country-code forms", () => {
    expect(NEPAL_PHONE_REGEX.test("982000000")).toBe(false);
    expect(NEPAL_PHONE_REGEX.test("9720000000")).toBe(false);
    expect(NEPAL_PHONE_REGEX.test("+977982000000")).toBe(false);
  });
});
