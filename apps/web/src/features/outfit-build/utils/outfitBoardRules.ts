import {
  findPlacementRefusal,
  type OutfitBoardItem,
  type OutfitPlacementRefusal,
  type OutfitSlotRule,
} from "@outfiqe/utils";

import type { OutfitBoard, OutfitProduct, OutfitSlot } from "../api/outfitSchemas";

const FIRST_POSITION = 0;
const NEXT_POSITION_STEP = 1;

export const toSlotRules = (board: OutfitBoard): OutfitSlotRule[] =>
  board.slots.map(({ key, maxItems, acceptsAnyProductType, productTypeIds, blocksSlotKeys }) => ({
    key,
    maxItems,
    acceptsAnyProductType,
    productTypeIds,
    blocksSlotKeys,
  }));

export const toBoardItems = (board: OutfitBoard): OutfitBoardItem[] =>
  board.slots.flatMap((slot) =>
    slot.items.map((item) => ({
      slotKey: slot.key,
      position: item.position,
      productId: item.product.id,
      addedById: item.addedBy?.id ?? null,
    })),
  );

export const firstFreePosition = (slot: OutfitSlot): number | null => {
  const takenPositions = new Set(slot.items.map((item) => item.position));
  for (let position = FIRST_POSITION; position < slot.maxItems; position += NEXT_POSITION_STEP) {
    if (!takenPositions.has(position)) return position;
  }
  return null;
};

export const findBoardRefusal = (
  board: OutfitBoard,
  placement: {
    slotKey: string;
    position: number;
    productId: string;
    productTypeId: string;
    addedById: string;
  },
): OutfitPlacementRefusal | null =>
  findPlacementRefusal({
    slots: toSlotRules(board),
    items: toBoardItems(board),
    placement,
    limits: {
      maxItemsPerBoard: board.limits.maxItemsPerBoard,
      maxItemsPerMember: board.maxItemsPerMember,
    },
  });

const everyoneUnhappy = (board: OutfitBoard): OutfitBoard["members"] =>
  board.members.map((member) => ({ ...member, isHappy: false }));

export const withItemPlaced = (
  board: OutfitBoard,
  {
    slotKey,
    position,
    product,
    addedBy,
  }: {
    slotKey: string;
    position: number;
    product: OutfitProduct;
    addedBy: OutfitBoard["members"][number]["user"] | null;
  },
): OutfitBoard => ({
  ...board,
  members: everyoneUnhappy(board),
  slots: board.slots.map((slot) =>
    slot.key === slotKey
      ? {
          ...slot,
          items: [
            ...slot.items.filter((item) => item.position !== position),
            { position, product, addedBy, addedAt: new Date().toISOString() },
          ].sort((first, second) => first.position - second.position),
        }
      : slot,
  ),
});

export const withItemRemoved = (
  board: OutfitBoard,
  slotKey: string,
  position: number,
): OutfitBoard => ({
  ...board,
  members: everyoneUnhappy(board),
  slots: board.slots.map((slot) =>
    slot.key === slotKey
      ? { ...slot, items: slot.items.filter((item) => item.position !== position) }
      : slot,
  ),
});

export const withHappiness = (
  board: OutfitBoard,
  userId: string,
  isHappy: boolean,
): OutfitBoard => ({
  ...board,
  members: board.members.map((member) =>
    member.user.id === userId ? { ...member, isHappy } : member,
  ),
});

export const countSoldOutItems = (board: OutfitBoard): number =>
  board.slots
    .flatMap((slot) => slot.items)
    .filter((item) => item.product.availability === "OUT_OF_STOCK").length;

export const SIZE_FIT = {
  IN_STOCK: "IN_STOCK",
  SOLD_OUT: "SOLD_OUT",
  NOT_OFFERED: "NOT_OFFERED",
} as const;

export type SizeFit = (typeof SIZE_FIT)[keyof typeof SIZE_FIT];

const NO_SIZES_KNOWN = 0;

export const describeSizeFit = (product: OutfitProduct, mySize: string): SizeFit | null => {
  if (product.sizes.length === NO_SIZES_KNOWN) return null;
  const matchingSize = product.sizes.find((size) => size.label === mySize);
  if (!matchingSize) return SIZE_FIT.NOT_OFFERED;
  return matchingSize.isInStock ? SIZE_FIT.IN_STOCK : SIZE_FIT.SOLD_OUT;
};
