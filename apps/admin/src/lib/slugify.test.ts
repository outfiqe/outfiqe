import { describe, expect, it } from "vitest";

import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and joins words with single hyphens", () => {
    expect(slugify("Old Money")).toBe("old-money");
  });

  it("drops punctuation and trims stray hyphens", () => {
    expect(slugify("  --Dashain Edit '26!  ")).toBe("dashain-edit-26");
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugify("  !!! ")).toBe("");
  });
});
