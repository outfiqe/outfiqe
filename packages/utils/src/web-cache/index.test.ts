import { describe, expect, it } from "vitest";

import { isWebRevalidateTag, WEB_REVALIDATE_TAGS } from "./index";

describe("isWebRevalidateTag", () => {
  it("accepts every declared tag value", () => {
    for (const tag of Object.values(WEB_REVALIDATE_TAGS)) {
      expect(isWebRevalidateTag(tag)).toBe(true);
    }
  });

  it("rejects an unknown string", () => {
    expect(isWebRevalidateTag("products")).toBe(false);
    expect(isWebRevalidateTag("")).toBe(false);
  });

  it("rejects a non-string", () => {
    expect(isWebRevalidateTag(undefined)).toBe(false);
    expect(isWebRevalidateTag(123)).toBe(false);
    expect(isWebRevalidateTag(["categories"])).toBe(false);
  });
});
