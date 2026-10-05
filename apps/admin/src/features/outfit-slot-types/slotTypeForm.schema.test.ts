import { describe, expect, it } from "vitest";

import type { OutfitSlotType } from "./schemas";
import {
  EMPTY_SLOT_TYPE_FORM,
  slotTypeFormSchema,
  toSlotTypeFormValues,
} from "./slotTypeForm.schema";

const validValues = {
  ...EMPTY_SLOT_TYPE_FORM,
  label: "Footwear",
  key: "footwear",
  icon: "footwear" as const,
  productTypeIds: ["type-footwear"],
};

const firstIssueMessage = (values: unknown) => {
  const result = slotTypeFormSchema.safeParse(values);
  return result.success ? null : result.error.issues[0]?.message;
};

describe("slotTypeFormSchema", () => {
  it("accepts a complete slot type", () => {
    expect(slotTypeFormSchema.safeParse(validValues).success).toBe(true);
  });

  it("asks for a garment type unless the slot takes any garment type", () => {
    expect(firstIssueMessage({ ...validValues, productTypeIds: [] })).toBe(
      "Pick at least one garment type, or let this slot take any garment type.",
    );
    expect(
      slotTypeFormSchema.safeParse({
        ...validValues,
        productTypeIds: [],
        acceptsAnyProductType: true,
      }).success,
    ).toBe(true);
  });

  it("explains a missing or out-of-range item count", () => {
    expect(firstIssueMessage({ ...validValues, maxItems: Number.NaN })).toBe(
      "Enter how many items this slot holds.",
    );
    expect(firstIssueMessage({ ...validValues, maxItems: 0 })).toBe(
      "A slot holds at least 1 item.",
    );
    expect(firstIssueMessage({ ...validValues, maxItems: 11 })).toBe(
      "A slot holds at most 10 items.",
    );
  });

  it("explains a malformed key", () => {
    expect(firstIssueMessage({ ...validValues, key: "Foot Wear" })).toBe(
      "Use lowercase letters, numbers and hyphens only.",
    );
  });
});

describe("toSlotTypeFormValues", () => {
  const savedSlotType: OutfitSlotType = {
    id: "slot-full",
    key: "full-outfit",
    label: "Full Outfit",
    icon: "dress",
    maxItems: 1,
    acceptsAnyProductType: false,
    sortOrder: 2,
    isActive: true,
    productTypes: [{ id: "type-saree", slug: "saree", label: "Saree" }],
    blocksSlotTypes: [{ id: "slot-top", key: "top", label: "Top" }],
    blockedBySlotTypes: [],
  };

  it("fills the form from a saved slot type", () => {
    expect(toSlotTypeFormValues(savedSlotType)).toEqual({
      label: "Full Outfit",
      key: "full-outfit",
      icon: "dress",
      maxItems: 1,
      acceptsAnyProductType: false,
      productTypeIds: ["type-saree"],
      blocksSlotTypeIds: ["slot-top"],
    });
  });

  it("falls back to a known icon when the saved one is no longer offered", () => {
    expect(toSlotTypeFormValues({ ...savedSlotType, icon: "rocket" }).icon).toBe("sparkles");
  });
});
