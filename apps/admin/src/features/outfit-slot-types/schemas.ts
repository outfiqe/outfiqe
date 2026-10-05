import { z } from "zod";

const slotTypeReferenceSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
});

export const outfitSlotTypeSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  icon: z.string(),
  maxItems: z.number(),
  acceptsAnyProductType: z.boolean(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  productTypes: z.array(z.object({ id: z.string(), slug: z.string(), label: z.string() })),
  blocksSlotTypes: z.array(slotTypeReferenceSchema),
  blockedBySlotTypes: z.array(slotTypeReferenceSchema),
});
export type OutfitSlotType = z.infer<typeof outfitSlotTypeSchema>;
