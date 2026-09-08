import { describe, expect, it } from "vitest";

import type { PublicCategory } from "@/features/categories";

import { resolveActiveCategorySlug, resolveDisplayCategories } from "./resolveTasteCategories";

const category = (slug: string): PublicCategory => ({
  id: slug,
  slug,
  name: slug,
  imageUrl: null,
  productCount: 0,
});

const allCategories = ["a", "b", "c", "d", "e", "f", "g", "h"].map(category);

describe("resolveDisplayCategories", () => {
  it("returns the first six admin-ordered categories when nothing is stored", () => {
    expect(resolveDisplayCategories(allCategories, null, null).map((c) => c.slug)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
  });

  it("returns the stored selection in stored order", () => {
    expect(
      resolveDisplayCategories(allCategories, ["g", "a", "c"], null).map((c) => c.slug),
    ).toEqual(["g", "a", "c"]);
  });

  it("prepends a deep-linked category that isn't already in the visible set", () => {
    expect(resolveDisplayCategories(allCategories, ["a", "b"], "h").map((c) => c.slug)).toEqual([
      "h",
      "a",
      "b",
    ]);
  });

  it("does not prepend a deep-linked category that is already visible", () => {
    expect(resolveDisplayCategories(allCategories, ["a", "b"], "b").map((c) => c.slug)).toEqual([
      "a",
      "b",
    ]);
  });

  it("ignores a deep-linked slug that matches no category", () => {
    expect(
      resolveDisplayCategories(allCategories, ["a", "b"], "missing").map((c) => c.slug),
    ).toEqual(["a", "b"]);
  });
});

describe("resolveActiveCategorySlug", () => {
  it("uses the deep-linked slug when present", () => {
    expect(resolveActiveCategorySlug([category("a"), category("b")], "b")).toBe("b");
  });

  it("falls back to the first display category otherwise", () => {
    expect(resolveActiveCategorySlug([category("g"), category("a")], null)).toBe("g");
  });

  it("is undefined when there are no categories and no deep link", () => {
    expect(resolveActiveCategorySlug([], null)).toBeUndefined();
  });
});
