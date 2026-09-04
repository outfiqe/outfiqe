import { describe, expect, it } from "vitest";

import { toImageHosts } from "./imageHosts";

describe("toImageHosts", () => {
  it("falls back to the api origin when no hosts are configured", () => {
    expect(toImageHosts(undefined, "https://api.outfiqe.com")).toEqual(["api.outfiqe.com"]);
  });

  it("keeps the api origin alongside configured hosts so a storage move is not a cliff edge", () => {
    expect(toImageHosts("cdn.outfiqe.com,images.outfiqe.com", "https://api.outfiqe.com")).toEqual([
      "cdn.outfiqe.com",
      "images.outfiqe.com",
      "api.outfiqe.com",
    ]);
  });

  it("accepts a full url or a bare hostname", () => {
    expect(toImageHosts("https://cdn.outfiqe.com/uploads", undefined)).toEqual(["cdn.outfiqe.com"]);
  });

  it("drops blanks and duplicates", () => {
    expect(toImageHosts("cdn.outfiqe.com, ,cdn.outfiqe.com", "https://cdn.outfiqe.com")).toEqual([
      "cdn.outfiqe.com",
    ]);
  });

  it("returns nothing to match when neither is configured", () => {
    expect(toImageHosts(undefined, undefined)).toEqual([]);
  });
});
