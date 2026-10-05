import { describe, expect, it } from "vitest";

import type { OutfitBoard, OutfitProduct, OutfitSlot } from "../api/outfitSchemas";
import {
  countSoldOutItems,
  describeSizeFit,
  findBoardRefusal,
  firstFreePosition,
  SIZE_FIT,
  toBuyableBuildItems,
  withHappiness,
  withItemPlaced,
  withItemRemoved,
} from "./outfitBoardRules";

const SITA = { id: "user-sita", name: "Sita", handle: "sita", avatarUrl: null };
const RAM = { id: "user-ram", name: "Ram", handle: "ram", avatarUrl: null };

const product = (id: string, productTypeId = "type-tops"): OutfitProduct => ({
  id,
  name: `Product ${id}`,
  imageUrl: null,
  price: 1_000,
  listPrice: 1_000,
  productTypeId,
  brand: { id: "brand-1", name: "Kathmandu Threads" },
  availability: "IN_STOCK",
  sizes: [],
});

const slot = (overrides: Partial<OutfitSlot>): OutfitSlot => ({
  key: "top",
  label: "Top",
  icon: "shirt",
  maxItems: 1,
  acceptsAnyProductType: false,
  productTypeIds: ["type-tops"],
  blocksSlotKeys: [],
  isBlocked: false,
  items: [],
  ...overrides,
});

const board = (slots: OutfitSlot[]): OutfitBoard => ({
  id: "outfit-1",
  title: null,
  status: "DRAFT",
  visibility: "PRIVATE",
  version: 3,
  budget: null,
  maxItemsPerMember: null,
  publishedVersion: null,
  lastLockedVersion: null,
  conversationId: null,
  sourceConversationId: null,
  lockedAt: null,
  archivedAt: null,
  createdAt: "2026-09-30T10:00:00.000Z",
  updatedAt: "2026-09-30T10:00:00.000Z",
  myRole: "OWNER",
  members: [
    {
      user: SITA,
      role: "OWNER",
      isHappy: true,
      joinedAt: "2026-09-30T10:00:00.000Z",
      canReceiveOffers: false,
    },
    {
      user: RAM,
      role: "EDITOR",
      isHappy: true,
      joinedAt: "2026-09-30T10:00:00.000Z",
      canReceiveOffers: false,
    },
  ],
  slots,
  itemCount: 0,
  total: 0,
  isOverBudget: false,
  isFullyAvailable: true,
  isEveryoneHappy: true,
  limits: {
    maxItemsPerBoard: 7,
    minItemsToLock: 2,
    maxEditorsPerBoard: 5,
    maxPhotosPerMember: 5,
    maxPhotosPerBoard: 15,
    maxCoverPhotos: 6,
  },
  photos: [],
});

const placedItem = (productId: string, position = 0) => ({
  position,
  product: product(productId),
  addedBy: SITA,
  addedAt: "2026-09-30T10:00:00.000Z",
});

describe("toBuyableBuildItems", () => {
  it("lists every item on the board with its sizes and my saved size for its type", () => {
    const shirt = {
      ...placedItem("shirt"),
      product: { ...product("shirt"), sizes: [{ label: "M", isInStock: true }] },
    };
    const trousers = { ...placedItem("trousers"), product: product("trousers", "type-bottoms") };
    const current = board([slot({ items: [shirt] }), slot({ key: "bottom", items: [trousers] })]);

    expect(toBuyableBuildItems(current, new Map([["type-tops", "M"]]))).toEqual([
      {
        productId: "shirt",
        productName: "Product shirt",
        sizes: [{ label: "M", isInStock: true }],
        suggestedSizeLabel: "M",
      },
      {
        productId: "trousers",
        productName: "Product trousers",
        sizes: [],
        suggestedSizeLabel: undefined,
      },
    ]);
  });
});

describe("firstFreePosition", () => {
  it("finds the first gap, or nothing when the slot is full", () => {
    const extras = slot({
      key: "extra",
      maxItems: 3,
      items: [placedItem("a", 0), placedItem("b", 2)],
    });
    expect(firstFreePosition(extras)).toBe(1);
    expect(firstFreePosition(slot({ items: [placedItem("a")] }))).toBeNull();
  });
});

describe("findBoardRefusal", () => {
  it("uses the shared slot rules against the board on screen", () => {
    const current = board([slot({})]);
    expect(
      findBoardRefusal(current, {
        slotKey: "top",
        position: 0,
        productId: "shoe",
        productTypeId: "type-footwear",
        addedById: SITA.id,
      }),
    ).toBe("WRONG_SLOT_FOR_PRODUCT");
    expect(
      findBoardRefusal(current, {
        slotKey: "top",
        position: 0,
        productId: "shirt",
        productTypeId: "type-tops",
        addedById: SITA.id,
      }),
    ).toBeNull();
  });
});

describe("instant board changes", () => {
  it("places an item, clears everyone's I'm happy, and keeps items in order", () => {
    const current = board([slot({ key: "extra", maxItems: 3, items: [placedItem("b", 1)] })]);

    const changed = withItemPlaced(current, {
      slotKey: "extra",
      position: 0,
      product: product("a"),
      addedBy: RAM,
    });

    expect(changed.slots[0]?.items.map((item) => item.product.id)).toEqual(["a", "b"]);
    expect(changed.members.every((member) => !member.isHappy)).toBe(true);
  });

  it("swaps whatever was in the position", () => {
    const current = board([slot({ items: [placedItem("old")] })]);

    const changed = withItemPlaced(current, {
      slotKey: "top",
      position: 0,
      product: product("new"),
      addedBy: SITA,
    });

    expect(changed.slots[0]?.items.map((item) => item.product.id)).toEqual(["new"]);
  });

  it("removes an item and clears everyone's I'm happy", () => {
    const changed = withItemRemoved(board([slot({ items: [placedItem("a")] })]), "top", 0);

    expect(changed.slots[0]?.items).toEqual([]);
    expect(changed.members.some((member) => member.isHappy)).toBe(false);
  });

  it("changes only one person's I'm happy", () => {
    const changed = withHappiness(board([slot({})]), RAM.id, false);

    expect(changed.members.map((member) => member.isHappy)).toEqual([true, false]);
  });
});

describe("countSoldOutItems", () => {
  it("counts only the items that are out of stock", () => {
    const soldOut = { ...product("a"), availability: "OUT_OF_STOCK" as const };
    const current = board([
      slot({
        key: "extra",
        maxItems: 3,
        items: [{ ...placedItem("a", 0), product: soldOut }, placedItem("b", 1)],
      }),
    ]);

    expect(countSoldOutItems(current)).toBe(1);
  });
});

describe("describeSizeFit", () => {
  const sizedProduct: OutfitProduct = {
    ...product("sized"),
    sizes: [
      { label: "M", isInStock: true },
      { label: "L", isInStock: false },
    ],
  };

  it("says whether the person's size is in stock, sold out, or not made", () => {
    expect(describeSizeFit(sizedProduct, "M")).toBe(SIZE_FIT.IN_STOCK);
    expect(describeSizeFit(sizedProduct, "L")).toBe(SIZE_FIT.SOLD_OUT);
    expect(describeSizeFit(sizedProduct, "XS")).toBe(SIZE_FIT.NOT_OFFERED);
  });

  it("says nothing while the product's sizes aren't known yet", () => {
    expect(describeSizeFit(product("unsized"), "M")).toBeNull();
  });
});
