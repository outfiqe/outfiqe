import { describe, expect, it } from "vitest";

import { createProductTypeSchema, reorderProductTypesSchema } from "./product-type.schemas.js";

describe("createProductTypeSchema", () => {
  it("accepts a lowercase hyphenated slug", () => {
    const result = createProductTypeSchema.safeParse({ label: "Shoes", slug: "shoes" });
    expect(result.success).toBe(true);
  });

  it("rejects a slug with spaces or capitals", () => {
    expect(createProductTypeSchema.safeParse({ label: "Shoes", slug: "Shoe Wear" }).success).toBe(
      false,
    );
  });

  it("rejects a blank label", () => {
    expect(createProductTypeSchema.safeParse({ label: " ", slug: "shoes" }).success).toBe(false);
  });
});

describe("reorderProductTypesSchema", () => {
  it("requires at least one id", () => {
    expect(reorderProductTypesSchema.safeParse({ orderedIds: [] }).success).toBe(false);
  });

  it("requires every id to be a uuid", () => {
    expect(reorderProductTypesSchema.safeParse({ orderedIds: ["not-a-uuid"] }).success).toBe(false);
  });
});
