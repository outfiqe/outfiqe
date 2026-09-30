import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createOutfitSlotTypeSchema,
  reorderOutfitSlotTypesSchema,
  updateOutfitSlotTypeSchema,
} from "./outfit-slot-type.schemas.js";

const validCreateBody = () => ({
  key: "scarf",
  label: "Scarf",
  icon: "accessory",
  maxItems: 1,
  productTypeIds: [randomUUID()],
});

describe("createOutfitSlotTypeSchema", () => {
  it("fills in the defaults for a minimal slot type", () => {
    const parsed = createOutfitSlotTypeSchema.parse(validCreateBody());

    expect(parsed).toMatchObject({
      acceptsAnyProductType: false,
      isActive: true,
      blocksSlotTypeIds: [],
    });
  });

  it("needs a garment type unless the slot takes any garment type", () => {
    expect(
      createOutfitSlotTypeSchema.safeParse({ ...validCreateBody(), productTypeIds: [] }).success,
    ).toBe(false);
    expect(
      createOutfitSlotTypeSchema.safeParse({
        ...validCreateBody(),
        productTypeIds: [],
        acceptsAnyProductType: true,
      }).success,
    ).toBe(true);
  });

  it("refuses a key that isn't lowercase with hyphens", () => {
    for (const key of ["Scarf", "scarf_top", "-scarf", "s"]) {
      expect(createOutfitSlotTypeSchema.safeParse({ ...validCreateBody(), key }).success).toBe(
        false,
      );
    }
  });

  it("refuses repeated ids, an unknown icon, out-of-range item counts and extra fields", () => {
    const repeatedId = randomUUID();
    const invalidBodies = [
      { ...validCreateBody(), productTypeIds: [repeatedId, repeatedId] },
      { ...validCreateBody(), icon: "rocket" },
      { ...validCreateBody(), maxItems: 0 },
      { ...validCreateBody(), maxItems: 11 },
      { ...validCreateBody(), maxItems: 1.5 },
      { ...validCreateBody(), sortOrder: 3 },
    ];

    for (const invalidBody of invalidBodies) {
      expect(createOutfitSlotTypeSchema.safeParse(invalidBody).success).toBe(false);
    }
  });
});

describe("updateOutfitSlotTypeSchema", () => {
  it("accepts a partial change and refuses an empty one or a key change", () => {
    expect(updateOutfitSlotTypeSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(updateOutfitSlotTypeSchema.safeParse({}).success).toBe(false);
    expect(updateOutfitSlotTypeSchema.safeParse({ key: "renamed" }).success).toBe(false);
  });
});

describe("reorderOutfitSlotTypesSchema", () => {
  it("needs at least one id", () => {
    expect(reorderOutfitSlotTypesSchema.safeParse({ orderedIds: [] }).success).toBe(false);
    expect(reorderOutfitSlotTypesSchema.safeParse({ orderedIds: [randomUUID()] }).success).toBe(
      true,
    );
  });
});
