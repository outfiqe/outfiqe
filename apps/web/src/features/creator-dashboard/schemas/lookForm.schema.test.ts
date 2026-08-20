import { describe, expect, it } from "vitest";

import { editLookFormSchema, lookFormSchema } from "./lookForm.schema";

describe("lookFormSchema", () => {
  const validInput = {
    imageUrls: ["https://cdn.outfiqe.test/a.jpg"],
    caption: "A great fit",
    taggedProducts: [{ productId: "product-1", sizeWorn: "M" }],
  };

  it("accepts a valid look submission", () => {
    const result = lookFormSchema.safeParse(validInput);

    expect(result.success).toBe(true);
  });

  it("rejects an empty imageUrls array", () => {
    const result = lookFormSchema.safeParse({ ...validInput, imageUrls: [] });

    expect(result.success).toBe(false);
  });

  it("rejects more than six images", () => {
    const result = lookFormSchema.safeParse({
      ...validInput,
      imageUrls: Array.from({ length: 7 }, (_, index) => `https://cdn.outfiqe.test/${index}.jpg`),
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-url image entry", () => {
    const result = lookFormSchema.safeParse({ ...validInput, imageUrls: ["not-a-url"] });

    expect(result.success).toBe(false);
  });

  it("allows an omitted caption", () => {
    const { caption, ...rest } = validInput;
    void caption;
    const result = lookFormSchema.safeParse(rest);

    expect(result.success).toBe(true);
  });

  it("rejects a caption over 280 characters", () => {
    const result = lookFormSchema.safeParse({ ...validInput, caption: "a".repeat(281) });

    expect(result.success).toBe(false);
  });

  it("allows zero tagged products", () => {
    const result = lookFormSchema.safeParse({ ...validInput, taggedProducts: [] });

    expect(result.success).toBe(true);
  });

  it("rejects more than six tagged products", () => {
    const result = lookFormSchema.safeParse({
      ...validInput,
      taggedProducts: Array.from({ length: 7 }, (_, index) => ({
        productId: `product-${index}`,
        sizeWorn: "M",
      })),
    });

    expect(result.success).toBe(false);
  });

  it("rejects a tagged product with a blank size", () => {
    const result = lookFormSchema.safeParse({
      ...validInput,
      taggedProducts: [{ productId: "product-1", sizeWorn: "" }],
    });

    expect(result.success).toBe(false);
  });
});

describe("editLookFormSchema", () => {
  it("accepts a caption and tagged products without requiring imageUrls", () => {
    const result = editLookFormSchema.safeParse({
      caption: "Updated caption",
      taggedProducts: [{ productId: "product-1", sizeWorn: "L" }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects more than six tagged products", () => {
    const result = editLookFormSchema.safeParse({
      taggedProducts: Array.from({ length: 7 }, (_, index) => ({
        productId: `product-${index}`,
        sizeWorn: "M",
      })),
    });

    expect(result.success).toBe(false);
  });
});
