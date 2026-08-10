import { z } from "zod";

const CAPTION_MAX = 280;
const MIN_TAGGED_PRODUCTS = 0;
const MAX_TAGGED_PRODUCTS = 6;

export const taggedProductInputSchema = z.object({
  productId: z.string(),
  sizeWorn: z.string().min(1, "Size is required"),
});

export const lookFormSchema = z.object({
  imageUrl: z.url(),
  caption: z.string().max(CAPTION_MAX).optional(),
  taggedProducts: z
    .array(taggedProductInputSchema)
    .min(MIN_TAGGED_PRODUCTS)
    .max(MAX_TAGGED_PRODUCTS),
});
export type LookFormInput = z.infer<typeof lookFormSchema>;
