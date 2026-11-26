import { describe, expect, it } from "vitest";

import { NEPAL_PHONE_REGEX, normalizeNepalPhone, stripPhoneSeparators } from "./index";

describe("stripPhoneSeparators", () => {
  it("removes spaces and dashes", () => {
    expect(stripPhoneSeparators("98 200-00000")).toBe("9820000000");
  });
});

describe("normalizeNepalPhone", () => {
  it("drops a +977 country prefix", () => {
    expect(normalizeNepalPhone("+977 98 2000-0000")).toBe("9820000000");
  });

  it("drops a bare 977 country prefix", () => {
    expect(normalizeNepalPhone("9779820000000")).toBe("9820000000");
  });

  it("leaves a plain ten digit number untouched", () => {
    expect(normalizeNepalPhone("9820000000")).toBe("9820000000");
  });

  it("leaves numbers that are not Nepali mobiles for the validator to reject", () => {
    expect(normalizeNepalPhone("+977 1 4000000")).toBe("+97714000000");
    expect(normalizeNepalPhone("+977982000000")).toBe("+977982000000");
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
