import { describe, expect, it } from "vitest";

import {
  areSlotsExclusive,
  canProductTypeFillSlot,
  findBlockedSlotKeys,
  findPlacementRefusal,
  isOutfitSlotIcon,
  OUTFIT_PLACEMENT_REFUSAL,
  type OutfitBoardItem,
  type OutfitPlacement,
  type OutfitSlotRule,
} from "./index";

const TOPS = "type-tops";
const BOTTOMS = "type-bottoms";
const DRESSES = "type-dresses";
const FOOTWEAR = "type-footwear";
const OWNER = "user-owner";
const EDITOR = "user-editor";

const topSlot: OutfitSlotRule = {
  key: "top",
  maxItems: 1,
  acceptsAnyProductType: false,
  productTypeIds: [TOPS],
  blocksSlotKeys: [],
};
const bottomSlot: OutfitSlotRule = {
  key: "bottom",
  maxItems: 1,
  acceptsAnyProductType: false,
  productTypeIds: [BOTTOMS],
  blocksSlotKeys: [],
};
const fullOutfitSlot: OutfitSlotRule = {
  key: "full-outfit",
  maxItems: 1,
  acceptsAnyProductType: false,
  productTypeIds: [DRESSES],
  blocksSlotKeys: ["top", "bottom"],
};
const footwearSlot: OutfitSlotRule = {
  key: "footwear",
  maxItems: 1,
  acceptsAnyProductType: false,
  productTypeIds: [FOOTWEAR],
  blocksSlotKeys: [],
};
const extraSlot: OutfitSlotRule = {
  key: "extra",
  maxItems: 3,
  acceptsAnyProductType: true,
  productTypeIds: [],
  blocksSlotKeys: [],
};

const defaultSlots = [topSlot, bottomSlot, fullOutfitSlot, footwearSlot, extraSlot];
const roomyLimits = { maxItemsPerBoard: 7, maxItemsPerMember: null };

const boardItem = (overrides: Partial<OutfitBoardItem>): OutfitBoardItem => ({
  slotKey: "top",
  position: 0,
  productId: "product-shirt",
  addedById: OWNER,
  ...overrides,
});

const placementOf = (overrides: Partial<OutfitPlacement>): OutfitPlacement => ({
  slotKey: "top",
  position: 0,
  productId: "product-new",
  productTypeId: TOPS,
  addedById: OWNER,
  ...overrides,
});

const refusalFor = (
  placement: OutfitPlacement,
  items: OutfitBoardItem[] = [],
  limits: { maxItemsPerBoard: number; maxItemsPerMember: number | null } = roomyLimits,
) => findPlacementRefusal({ slots: defaultSlots, items, placement, limits });

describe("isOutfitSlotIcon", () => {
  it("accepts a known icon and refuses anything else", () => {
    expect(isOutfitSlotIcon("footwear")).toBe(true);
    expect(isOutfitSlotIcon("rocket")).toBe(false);
  });
});

describe("canProductTypeFillSlot", () => {
  it("allows the slot's own product types and refuses others", () => {
    expect(canProductTypeFillSlot(topSlot, TOPS)).toBe(true);
    expect(canProductTypeFillSlot(topSlot, FOOTWEAR)).toBe(false);
  });

  it("lets a slot that accepts any product type take anything", () => {
    expect(canProductTypeFillSlot(extraSlot, FOOTWEAR)).toBe(true);
  });
});

describe("areSlotsExclusive", () => {
  it("treats a block as working in both directions", () => {
    expect(areSlotsExclusive(fullOutfitSlot, topSlot)).toBe(true);
    expect(areSlotsExclusive(topSlot, fullOutfitSlot)).toBe(true);
  });

  it("never makes a slot exclusive with itself or with an unrelated slot", () => {
    expect(areSlotsExclusive(fullOutfitSlot, fullOutfitSlot)).toBe(false);
    expect(areSlotsExclusive(topSlot, footwearSlot)).toBe(false);
  });
});

describe("findBlockedSlotKeys", () => {
  it("blocks nothing on an empty board", () => {
    expect(findBlockedSlotKeys(defaultSlots, [])).toEqual([]);
  });

  it("blocks Top and Bottom while Full Outfit is filled", () => {
    const items = [boardItem({ slotKey: "full-outfit", productId: "product-dress" })];
    expect(findBlockedSlotKeys(defaultSlots, items)).toEqual(["top", "bottom"]);
  });

  it("blocks Full Outfit while Top is filled", () => {
    expect(findBlockedSlotKeys(defaultSlots, [boardItem({})])).toEqual(["full-outfit"]);
  });
});

describe("findPlacementRefusal", () => {
  it("allows a valid product in an empty slot", () => {
    expect(refusalFor(placementOf({}))).toBeNull();
  });

  it("refuses a slot the build does not have", () => {
    expect(refusalFor(placementOf({ slotKey: "cape" }))).toBe(
      OUTFIT_PLACEMENT_REFUSAL.UNKNOWN_SLOT,
    );
  });

  it("refuses a position outside the slot, including a second Top and a fourth Extra", () => {
    expect(refusalFor(placementOf({ position: 1 }))).toBe(OUTFIT_PLACEMENT_REFUSAL.SLOT_FULL);
    expect(
      refusalFor(placementOf({ slotKey: "extra", position: 3, productTypeId: FOOTWEAR })),
    ).toBe(OUTFIT_PLACEMENT_REFUSAL.SLOT_FULL);
    expect(refusalFor(placementOf({ position: -1 }))).toBe(OUTFIT_PLACEMENT_REFUSAL.SLOT_FULL);
    expect(refusalFor(placementOf({ position: 0.5 }))).toBe(OUTFIT_PLACEMENT_REFUSAL.SLOT_FULL);
  });

  it("refuses a product of the wrong kind, such as shoes in Top", () => {
    expect(refusalFor(placementOf({ productTypeId: FOOTWEAR }))).toBe(
      OUTFIT_PLACEMENT_REFUSAL.WRONG_SLOT_FOR_PRODUCT,
    );
  });

  it("refuses Top while Full Outfit is filled, and Full Outfit while Top is filled", () => {
    const dressItem = boardItem({ slotKey: "full-outfit", productId: "product-dress" });
    expect(refusalFor(placementOf({}), [dressItem])).toBe(OUTFIT_PLACEMENT_REFUSAL.SLOT_BLOCKED);

    expect(
      refusalFor(placementOf({ slotKey: "full-outfit", productTypeId: DRESSES }), [boardItem({})]),
    ).toBe(OUTFIT_PLACEMENT_REFUSAL.SLOT_BLOCKED);
  });

  it("allows swapping the product in a filled position", () => {
    expect(
      refusalFor(placementOf({ productId: "product-other-shirt" }), [boardItem({})]),
    ).toBeNull();
  });

  it("refuses the same product twice on one board", () => {
    const shirtInExtra = boardItem({ slotKey: "extra", position: 0, productId: "product-new" });
    expect(refusalFor(placementOf({}), [shirtInExtra])).toBe(
      OUTFIT_PLACEMENT_REFUSAL.PRODUCT_ALREADY_ON_BOARD,
    );
  });

  it("refuses an item that would take the board past its cap, but allows a swap at the cap", () => {
    const fullBoard = [
      boardItem({}),
      boardItem({ slotKey: "bottom", productId: "product-trousers" }),
    ];
    const tightLimits = { maxItemsPerBoard: 2, maxItemsPerMember: null };

    expect(
      refusalFor(
        placementOf({ slotKey: "footwear", productTypeId: FOOTWEAR }),
        fullBoard,
        tightLimits,
      ),
    ).toBe(OUTFIT_PLACEMENT_REFUSAL.BOARD_FULL);
    expect(refusalFor(placementOf({}), fullBoard, tightLimits)).toBeNull();
  });

  it("refuses a member's item past their limit, counting only their own items", () => {
    const perMemberLimits = { maxItemsPerBoard: 7, maxItemsPerMember: 1 };
    const ownerShirt = boardItem({});
    const footwearPlacement = placementOf({ slotKey: "footwear", productTypeId: FOOTWEAR });

    expect(refusalFor(footwearPlacement, [ownerShirt], perMemberLimits)).toBe(
      OUTFIT_PLACEMENT_REFUSAL.MEMBER_ITEM_LIMIT_REACHED,
    );
    expect(
      refusalFor({ ...footwearPlacement, addedById: EDITOR }, [ownerShirt], perMemberLimits),
    ).toBeNull();
  });

  it("moves a swapped slot onto the swapper's count", () => {
    const perMemberLimits = { maxItemsPerBoard: 7, maxItemsPerMember: 1 };
    const editorShirt = boardItem({ addedById: EDITOR });
    const ownerTrousers = boardItem({ slotKey: "bottom", productId: "product-trousers" });

    expect(
      refusalFor(
        placementOf({ productId: "product-other-shirt" }),
        [editorShirt, ownerTrousers],
        perMemberLimits,
      ),
    ).toBe(OUTFIT_PLACEMENT_REFUSAL.MEMBER_ITEM_LIMIT_REACHED);
    expect(
      refusalFor(
        placementOf({ productId: "product-other-shirt", addedById: EDITOR }),
        [editorShirt],
        perMemberLimits,
      ),
    ).toBeNull();
  });
});
