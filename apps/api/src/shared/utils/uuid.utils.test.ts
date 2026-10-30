import { describe, expect, it } from "vitest";

import { isUuid } from "./uuid.utils.js";

describe("isUuid", () => {
  it("accepts a valid uuid", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
  });
});
