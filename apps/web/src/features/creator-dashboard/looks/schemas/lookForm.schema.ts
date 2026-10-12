import { POST_LAYOUT_VALUES } from "@outfiqe/utils";
import { z } from "zod";

const CAPTION_MAX = 280;
const MIN_TAGGED_PRODUCTS = 0;
const TAGGED_PRODUCTS_CEILING = 30;
const MIN_IMAGES = 1;
const MAX_IMAGES = 6;

export const taggedProductInputSchema = z.object({
  productId: z.string(),
  sizeWorn: z.string().min(1, "Size is required"),
});

export const lookFormSchema = z.object({
  imageUrls: z.array(z.url()).min(MIN_IMAGES, "Add at least one photo").max(MAX_IMAGES),
  imageAssetIds: z.array(z.uuid().nullable()).max(MAX_IMAGES).optional(),
  caption: z.string().max(CAPTION_MAX).optional(),
  layout: z.enum(POST_LAYOUT_VALUES).optional(),
  taggedProducts: z
    .array(taggedProductInputSchema)
    .min(MIN_TAGGED_PRODUCTS)
    .max(TAGGED_PRODUCTS_CEILING),
});
export type LookFormInput = z.infer<typeof lookFormSchema>;

export const editLookFormSchema = z.object({
  caption: z.string().max(CAPTION_MAX).optional(),
  taggedProducts: z
    .array(taggedProductInputSchema)
    .min(MIN_TAGGED_PRODUCTS)
    .max(TAGGED_PRODUCTS_CEILING),
});
export type EditLookFormInput = z.infer<typeof editLookFormSchema>;
