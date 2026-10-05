import { OUTFIT_SLOT_ICONS } from "@outfiqe/utils";
import { z } from "zod";

import { OUTFIT_SLOT_TYPE_LIMITS } from "./outfit-slot-type.constants.js";

const {
  KEY_MIN_LENGTH,
  KEY_MAX_LENGTH,
  LABEL_MIN_LENGTH,
  LABEL_MAX_LENGTH,
  MIN_ITEMS_PER_SLOT,
  MAX_ITEMS_PER_SLOT,
  MAX_LINKED_PRODUCT_TYPES,
  MAX_BLOCKED_SLOT_TYPES,
} = OUTFIT_SLOT_TYPE_LIMITS;

const SLOT_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const hasNoDuplicates = (ids: string[]) => new Set(ids).size === ids.length;

const uniqueIdListSchema = (maxLength: number) =>
  z.array(z.uuid()).max(maxLength).refine(hasNoDuplicates, { message: "List each id only once." });

const slotTypeFieldsSchema = z.object({
  label: z.string().trim().min(LABEL_MIN_LENGTH).max(LABEL_MAX_LENGTH),
  icon: z.enum(OUTFIT_SLOT_ICONS),
  maxItems: z.number().int().min(MIN_ITEMS_PER_SLOT).max(MAX_ITEMS_PER_SLOT),
  acceptsAnyProductType: z.boolean(),
  isActive: z.boolean(),
  productTypeIds: uniqueIdListSchema(MAX_LINKED_PRODUCT_TYPES),
  blocksSlotTypeIds: uniqueIdListSchema(MAX_BLOCKED_SLOT_TYPES),
});

export const createOutfitSlotTypeSchema = slotTypeFieldsSchema
  .extend({
    key: z
      .string()
      .trim()
      .min(KEY_MIN_LENGTH)
      .max(KEY_MAX_LENGTH)
      .regex(SLOT_KEY_PATTERN, "Use lowercase letters, numbers and hyphens only."),
    acceptsAnyProductType: z.boolean().default(false),
    isActive: z.boolean().default(true),
    blocksSlotTypeIds: uniqueIdListSchema(MAX_BLOCKED_SLOT_TYPES).default([]),
  })
  .strict()
  .refine((body) => body.acceptsAnyProductType || body.productTypeIds.length > 0, {
    message: "Pick at least one garment type, or let this slot take any garment type.",
    path: ["productTypeIds"],
  });

export const updateOutfitSlotTypeSchema = slotTypeFieldsSchema
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: "Change at least one field." });

export const outfitSlotTypeIdParamSchema = z.object({ id: z.uuid() });

export const reorderOutfitSlotTypesSchema = z
  .object({ orderedIds: z.array(z.uuid()).min(1) })
  .strict();

export type CreateOutfitSlotTypeBody = z.infer<typeof createOutfitSlotTypeSchema>;
export type UpdateOutfitSlotTypeBody = z.infer<typeof updateOutfitSlotTypeSchema>;
export type OutfitSlotTypeIdParam = z.infer<typeof outfitSlotTypeIdParamSchema>;
export type ReorderOutfitSlotTypesBody = z.infer<typeof reorderOutfitSlotTypesSchema>;
