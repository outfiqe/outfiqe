import { isOutfitSlotIcon, OUTFIT_SLOT_ICONS } from "@outfiqe/utils";
import { z } from "zod";

import type { OutfitSlotType } from "../api/outfitSlotTypesSchemas";

const LABEL_MIN_LENGTH = 2;
const LABEL_MAX_LENGTH = 40;
const KEY_MIN_LENGTH = 2;
const KEY_MAX_LENGTH = 40;
const MIN_ITEMS_PER_SLOT = 1;
const MAX_ITEMS_PER_SLOT = 10;
const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DEFAULT_ICON = "sparkles";
const DEFAULT_MAX_ITEMS = 1;

export const slotTypeFormSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Enter a name for the slot.")
      .min(LABEL_MIN_LENGTH, `Use at least ${LABEL_MIN_LENGTH} characters.`)
      .max(LABEL_MAX_LENGTH, `Use at most ${LABEL_MAX_LENGTH} characters.`),
    key: z
      .string()
      .trim()
      .min(1, "Enter a key for the slot.")
      .min(KEY_MIN_LENGTH, `Use at least ${KEY_MIN_LENGTH} characters.`)
      .max(KEY_MAX_LENGTH, `Use at most ${KEY_MAX_LENGTH} characters.`)
      .regex(KEY_PATTERN, "Use lowercase letters, numbers and hyphens only."),
    icon: z.enum(OUTFIT_SLOT_ICONS, { error: "Pick an icon." }),
    maxItems: z
      .number({ error: "Enter how many items this slot holds." })
      .int("Use a whole number.")
      .min(MIN_ITEMS_PER_SLOT, `A slot holds at least ${MIN_ITEMS_PER_SLOT} item.`)
      .max(MAX_ITEMS_PER_SLOT, `A slot holds at most ${MAX_ITEMS_PER_SLOT} items.`),
    acceptsAnyProductType: z.boolean(),
    productTypeIds: z.array(z.string()),
    blocksSlotTypeIds: z.array(z.string()),
  })
  .refine((values) => values.acceptsAnyProductType || values.productTypeIds.length > 0, {
    message: "Pick at least one garment type, or let this slot take any garment type.",
    path: ["productTypeIds"],
  });

export type SlotTypeFormValues = z.infer<typeof slotTypeFormSchema>;

export const EMPTY_SLOT_TYPE_FORM: SlotTypeFormValues = {
  label: "",
  key: "",
  icon: DEFAULT_ICON,
  maxItems: DEFAULT_MAX_ITEMS,
  acceptsAnyProductType: false,
  productTypeIds: [],
  blocksSlotTypeIds: [],
};

export const toSlotTypeFormValues = ({
  label,
  key,
  icon,
  maxItems,
  acceptsAnyProductType,
  productTypes,
  blocksSlotTypes,
}: OutfitSlotType): SlotTypeFormValues => ({
  label,
  key,
  icon: isOutfitSlotIcon(icon) ? icon : DEFAULT_ICON,
  maxItems,
  acceptsAnyProductType,
  productTypeIds: productTypes.map((productType) => productType.id),
  blocksSlotTypeIds: blocksSlotTypes.map((slotType) => slotType.id),
});
