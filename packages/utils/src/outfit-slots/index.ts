export const OUTFIT_SLOT_ICONS = [
  "shirt",
  "trousers",
  "dress",
  "footwear",
  "accessory",
  "bag",
  "jewellery",
  "hat",
  "jacket",
  "sparkles",
] as const;

export type OutfitSlotIcon = (typeof OUTFIT_SLOT_ICONS)[number];

export const isOutfitSlotIcon = (value: string): value is OutfitSlotIcon =>
  OUTFIT_SLOT_ICONS.some((icon) => icon === value);

export const OUTFIT_ITEMS_PER_MEMBER_CHOICES = [1, 2, 3] as const;

export const OUTFIT_PLACEMENT_REFUSAL = {
  UNKNOWN_SLOT: "UNKNOWN_SLOT",
  SLOT_FULL: "SLOT_FULL",
  WRONG_SLOT_FOR_PRODUCT: "WRONG_SLOT_FOR_PRODUCT",
  SLOT_BLOCKED: "SLOT_BLOCKED",
  PRODUCT_ALREADY_ON_BOARD: "PRODUCT_ALREADY_ON_BOARD",
  BOARD_FULL: "BOARD_FULL",
  MEMBER_ITEM_LIMIT_REACHED: "MEMBER_ITEM_LIMIT_REACHED",
} as const;

export type OutfitPlacementRefusal =
  (typeof OUTFIT_PLACEMENT_REFUSAL)[keyof typeof OUTFIT_PLACEMENT_REFUSAL];

export type OutfitSlotRule = {
  key: string;
  maxItems: number;
  acceptsAnyProductType: boolean;
  productTypeIds: readonly string[];
  blocksSlotKeys: readonly string[];
};

export type OutfitBoardItem = {
  slotKey: string;
  position: number;
  productId: string;
  addedById: string | null;
};

export type OutfitPlacement = {
  slotKey: string;
  position: number;
  productId: string;
  productTypeId: string;
  addedById: string;
};

export type OutfitBoardLimits = {
  maxItemsPerBoard: number;
  maxItemsPerMember: number | null;
};

const FIRST_SLOT_POSITION = 0;
const PLACED_ITEM_COUNT = 1;

export const canProductTypeFillSlot = (slot: OutfitSlotRule, productTypeId: string): boolean =>
  slot.acceptsAnyProductType || slot.productTypeIds.includes(productTypeId);

export const areSlotsExclusive = (first: OutfitSlotRule, second: OutfitSlotRule): boolean =>
  first.key !== second.key &&
  (first.blocksSlotKeys.includes(second.key) || second.blocksSlotKeys.includes(first.key));

export const findBlockedSlotKeys = (
  slots: readonly OutfitSlotRule[],
  items: readonly OutfitBoardItem[],
): string[] => {
  const filledSlotKeys = new Set(items.map((item) => item.slotKey));
  const filledSlots = slots.filter((slot) => filledSlotKeys.has(slot.key));
  return slots
    .filter((slot) => filledSlots.some((filledSlot) => areSlotsExclusive(slot, filledSlot)))
    .map((slot) => slot.key);
};

const isSamePosition = (item: OutfitBoardItem, placement: OutfitPlacement): boolean =>
  item.slotKey === placement.slotKey && item.position === placement.position;

export const findPlacementRefusal = ({
  slots,
  items,
  placement,
  limits,
}: {
  slots: readonly OutfitSlotRule[];
  items: readonly OutfitBoardItem[];
  placement: OutfitPlacement;
  limits: OutfitBoardLimits;
}): OutfitPlacementRefusal | null => {
  const targetSlot = slots.find((slot) => slot.key === placement.slotKey);
  if (!targetSlot) return OUTFIT_PLACEMENT_REFUSAL.UNKNOWN_SLOT;

  const isPositionInSlot =
    Number.isInteger(placement.position) &&
    placement.position >= FIRST_SLOT_POSITION &&
    placement.position < targetSlot.maxItems;
  if (!isPositionInSlot) return OUTFIT_PLACEMENT_REFUSAL.SLOT_FULL;

  if (!canProductTypeFillSlot(targetSlot, placement.productTypeId)) {
    return OUTFIT_PLACEMENT_REFUSAL.WRONG_SLOT_FOR_PRODUCT;
  }

  const remainingItems = items.filter((item) => !isSamePosition(item, placement));

  const remainingFilledSlotKeys = new Set(remainingItems.map((item) => item.slotKey));
  const isBlocked = slots.some(
    (slot) => remainingFilledSlotKeys.has(slot.key) && areSlotsExclusive(slot, targetSlot),
  );
  if (isBlocked) return OUTFIT_PLACEMENT_REFUSAL.SLOT_BLOCKED;

  if (remainingItems.some((item) => item.productId === placement.productId)) {
    return OUTFIT_PLACEMENT_REFUSAL.PRODUCT_ALREADY_ON_BOARD;
  }

  if (remainingItems.length + PLACED_ITEM_COUNT > limits.maxItemsPerBoard) {
    return OUTFIT_PLACEMENT_REFUSAL.BOARD_FULL;
  }

  if (limits.maxItemsPerMember !== null) {
    const itemsAlreadyAddedByMember = remainingItems.filter(
      (item) => item.addedById === placement.addedById,
    ).length;
    if (itemsAlreadyAddedByMember + PLACED_ITEM_COUNT > limits.maxItemsPerMember) {
      return OUTFIT_PLACEMENT_REFUSAL.MEMBER_ITEM_LIMIT_REACHED;
    }
  }

  return null;
};
