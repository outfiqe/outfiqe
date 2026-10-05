import type { OutfitSlotTypeRow } from "./outfit-slot-type.repository.js";
import type { OutfitSlotTypeReferenceView, OutfitSlotTypeView } from "./outfit-slot-type.types.js";

const byLabel = <Entry extends { label: string }>(first: Entry, second: Entry) =>
  first.label.localeCompare(second.label);

const sortReferencesByLabel = (references: OutfitSlotTypeReferenceView[]) =>
  [...references].sort(byLabel);

export const toOutfitSlotTypeView = ({
  productTypes,
  blocks,
  blockedBy,
  ...slotType
}: OutfitSlotTypeRow): OutfitSlotTypeView => ({
  ...slotType,
  productTypes: productTypes.map(({ productType }) => productType).sort(byLabel),
  blocksSlotTypes: sortReferencesByLabel(blocks.map(({ blockedSlotType }) => blockedSlotType)),
  blockedBySlotTypes: sortReferencesByLabel(blockedBy.map(({ slotType }) => slotType)),
});

export const describeOutfitSlotTypeForAudit = ({
  key,
  label,
  icon,
  maxItems,
  acceptsAnyProductType,
  isActive,
  productTypes,
  blocksSlotTypes,
}: OutfitSlotTypeView) => ({
  key,
  label,
  icon,
  maxItems,
  acceptsAnyProductType,
  isActive,
  productTypeSlugs: productTypes.map((productType) => productType.slug),
  blocksSlotKeys: blocksSlotTypes.map((slotType) => slotType.key),
});
