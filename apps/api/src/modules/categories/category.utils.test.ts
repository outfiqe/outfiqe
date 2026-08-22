import { describe, expect, it } from "vitest";

import { CategoryStatus } from "#generated/prisma/enums.js";

import type { CategoryWithProductCount } from "./category.types.js";
import { toPublicCategory } from "./category.utils.js";

const baseCategory: CategoryWithProductCount = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "outerwear",
  name: "Outerwear",
  imageUrl: "https://cdn.outfiqe.test/outerwear.jpg",
  status: CategoryStatus.PUBLISHED,
  sortOrder: 2,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  productCount: 5,
};

describe("toPublicCategory", () => {
  it("maps a category record into its public shape", () => {
    const publicCategory = toPublicCategory(baseCategory);

    expect(publicCategory).toEqual({
      id: baseCategory.id,
      slug: baseCategory.slug,
      name: baseCategory.name,
      imageUrl: baseCategory.imageUrl,
      productCount: baseCategory.productCount,
    });
  });

  it("never leaks internal-only fields like status, sortOrder, createdAt, or updatedAt", () => {
    const publicCategory = toPublicCategory(baseCategory);

    expect(publicCategory).not.toHaveProperty("status");
    expect(publicCategory).not.toHaveProperty("sortOrder");
    expect(publicCategory).not.toHaveProperty("createdAt");
    expect(publicCategory).not.toHaveProperty("updatedAt");
  });

  it("passes through a null imageUrl unchanged", () => {
    const publicCategory = toPublicCategory({ ...baseCategory, imageUrl: null });

    expect(publicCategory.imageUrl).toBeNull();
  });
});
