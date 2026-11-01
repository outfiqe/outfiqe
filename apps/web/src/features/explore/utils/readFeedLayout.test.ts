import { describe, expect, it } from "vitest";

import { readFeedLayout } from "./readFeedLayout";

describe("readFeedLayout", () => {
  it("reads the list layout from the URL", () => {
    expect(readFeedLayout(new URLSearchParams("layout=list"))).toBe("list");
  });

  it("falls back to the grid when the URL has no layout or an unknown one", () => {
    expect(readFeedLayout(new URLSearchParams(""))).toBe("grid");
    expect(readFeedLayout(new URLSearchParams("layout=carousel"))).toBe("grid");
  });
});
