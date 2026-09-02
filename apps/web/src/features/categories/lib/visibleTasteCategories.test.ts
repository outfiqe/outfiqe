import { describe, expect, it } from "vitest";

import type { PublicCategory } from "../api/categorySchemas";
import { visibleTasteCategories } from "./visibleTasteCategories";

const category = (slug: string): PublicCategory => ({
  id: slug,
  slug,
  name: slug,
  imageUrl: null,
  productCount: 0,
});

const all = ["a", "b", "c", "d", "e", "f", "g", "h"].map(category);

describe("visibleTasteCategories", () => {
  it("returns the first six admin-ordered categories when nothing is stored", () => {
    expect(visibleTasteCategories(all, null).map((c) => c.slug)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
  });

  it("returns fewer than six when that is all there is", () => {
    const short = all.slice(0, 3);
    expect(visibleTasteCategories(short, null)).toHaveLength(3);
  });

  it("returns the stored selection, in stored order", () => {
    expect(visibleTasteCategories(all, ["g", "a", "c"]).map((c) => c.slug)).toEqual([
      "g",
      "a",
      "c",
    ]);
  });

  it("drops stored slugs that no longer exist", () => {
    expect(visibleTasteCategories(all, ["a", "gone", "c"]).map((c) => c.slug)).toEqual(["a", "c"]);
  });

  it("falls back to the first six when every stored slug is stale", () => {
    expect(visibleTasteCategories(all, ["gone", "also-gone"]).map((c) => c.slug)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
  });
});
