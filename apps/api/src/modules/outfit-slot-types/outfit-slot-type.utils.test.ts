import { describe, expect, it } from "vitest";

import type { OutfitSlotTypeRow } from "./outfit-slot-type.repository.js";
import { describeOutfitSlotTypeForAudit, toOutfitSlotTypeView } from "./outfit-slot-type.utils.js";

const CREATED_AT = new Date("2026-09-29T10:00:00Z");

const fullOutfitRow: OutfitSlotTypeRow = {
  id: "slot-full",
  key: "full-outfit",
  label: "Full Outfit",
  icon: "dress",
  maxItems: 1,
  acceptsAnyProductType: false,
  sortOrder: 2,
  isActive: true,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  productTypes: [
    {
      slotTypeId: "slot-full",
      productTypeId: "type-saree",
      productType: { id: "type-saree", slug: "saree", label: "Saree" },
    },
    {
      slotTypeId: "slot-full",
      productTypeId: "type-dresses",
      productType: { id: "type-dresses", slug: "dresses", label: "Dresses" },
    },
  ],
  blocks: [
    {
      slotTypeId: "slot-full",
      blockedSlotTypeId: "slot-top",
      blockedSlotType: { id: "slot-top", key: "top", label: "Top" },
    },
    {
      slotTypeId: "slot-full",
      blockedSlotTypeId: "slot-bottom",
      blockedSlotType: { id: "slot-bottom", key: "bottom", label: "Bottom" },
    },
  ],
  blockedBy: [],
};

describe("toOutfitSlotTypeView", () => {
  it("flattens the links and sorts them by label", () => {
    const view = toOutfitSlotTypeView(fullOutfitRow);

    expect(view.productTypes.map((productType) => productType.slug)).toEqual(["dresses", "saree"]);
    expect(view.blocksSlotTypes.map((slotType) => slotType.key)).toEqual(["bottom", "top"]);
    expect(view.blockedBySlotTypes).toEqual([]);
    expect(view).not.toHaveProperty("blocks");
  });
});

describe("describeOutfitSlotTypeForAudit", () => {
  it("keeps only what an admin changes, with links as readable keys", () => {
    expect(describeOutfitSlotTypeForAudit(toOutfitSlotTypeView(fullOutfitRow))).toEqual({
      key: "full-outfit",
      label: "Full Outfit",
      icon: "dress",
      maxItems: 1,
      acceptsAnyProductType: false,
      isActive: true,
      productTypeSlugs: ["dresses", "saree"],
      blocksSlotKeys: ["bottom", "top"],
    });
  });
});
