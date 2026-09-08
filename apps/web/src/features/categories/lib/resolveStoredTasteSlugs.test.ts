import { describe, expect, it } from "vitest";

import { resolveStoredTasteSlugs } from "./resolveStoredTasteSlugs";

describe("resolveStoredTasteSlugs", () => {
  it("prefers a signed-in visitor's server record over the cookie", () => {
    expect(resolveStoredTasteSlugs(["server-a", "server-b"], ["cookie-x"])).toEqual([
      "server-a",
      "server-b",
    ]);
  });

  it("falls back to the cookie when there is no server record", () => {
    expect(resolveStoredTasteSlugs(null, ["cookie-x", "cookie-y"])).toEqual([
      "cookie-x",
      "cookie-y",
    ]);
  });

  it("returns null when neither source has a stored pick", () => {
    expect(resolveStoredTasteSlugs(null, null)).toBeNull();
  });
});
