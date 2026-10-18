import { describe, expect, it } from "vitest";

import { toE164PhoneNumber } from "./phone.utils.js";

describe("toE164PhoneNumber", () => {
  it("turns a local Nepali mobile number into the international format", () => {
    expect(toE164PhoneNumber("9812345678", "NP")).toBe("+9779812345678");
  });

  it("accepts a number already written in the international format", () => {
    expect(toE164PhoneNumber("+977 981-234-5678", "NP")).toBe("+9779812345678");
  });

  it("returns null for a number that is not valid in that country", () => {
    expect(toE164PhoneNumber("12345", "NP")).toBeNull();
  });

  it("returns null for a country code the library does not know", () => {
    expect(toE164PhoneNumber("9812345678", "ZZ")).toBeNull();
  });
});
