import { describe, expect, it } from "vitest";

import { isUuid, toUuidPrefixRange } from "./uuid.utils.js";

describe("isUuid", () => {
  it("accepts a valid uuid", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});

describe("toUuidPrefixRange", () => {
  it("covers every id starting with a short order number", () => {
    expect(toUuidPrefixRange("907AD2FC")).toEqual({
      gte: "907ad2fc-0000-0000-0000-000000000000",
      lte: "907ad2fc-ffff-ffff-ffff-ffffffffffff",
    });
  });

  it("fills in a shorter start of the number", () => {
    expect(toUuidPrefixRange("907a")?.lte).toBe("907affff-ffff-ffff-ffff-ffffffffffff");
  });

  it("ignores text that isn't an order number", () => {
    expect(toUuidPrefixRange("Long coat")).toBeNull();
    expect(toUuidPrefixRange("9a")).toBeNull();
  });
});
