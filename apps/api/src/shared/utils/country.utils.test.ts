import { describe, expect, it } from "vitest";

import { countryCodeSchema, isValidTimeZone } from "./country.utils.js";

describe("isValidTimeZone", () => {
  it("accepts an IANA time zone", () => {
    expect(isValidTimeZone("Asia/Kathmandu")).toBe(true);
  });

  it("rejects a made-up time zone", () => {
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("countryCodeSchema", () => {
  it("accepts a supported country in any case", () => {
    expect(countryCodeSchema.parse(" np ")).toBe("NP");
  });

  it("rejects a country Outfiqe does not operate in", () => {
    expect(countryCodeSchema.safeParse("US").success).toBe(false);
  });
});
