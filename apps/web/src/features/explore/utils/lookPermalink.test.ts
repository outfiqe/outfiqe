import { describe, expect, it } from "vitest";

import { lookPermalinkPath } from "./lookPermalink";

describe("lookPermalinkPath", () => {
  it("builds a path to the look on its creator's profile", () => {
    expect(lookPermalinkPath("ram-shrestha", "look-1")).toBe("/creator/ram-shrestha?look=look-1");
  });
});
