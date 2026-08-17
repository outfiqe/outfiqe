import { z } from "zod";

export const taggedProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
});

export const creatorLookSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  caption: z.string().nullable(),
  createdAt: z.string(),
  taggedProducts: z.array(taggedProductSchema),
});
export type CreatorLook = z.infer<typeof creatorLookSchema>;

export const editTaggedProductSchema = z.object({
  productId: z.string(),
  sizeWorn: z.string(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    brand: z.string(),
    price: z.number(),
    imageUrl: z.string().nullable(),
  }),
});

export const creatorLookEditDetailSchema = z.object({
  id: z.string(),
  imageUrls: z.array(z.string()),
  caption: z.string().nullable(),
  taggedProducts: z.array(editTaggedProductSchema),
});
export type CreatorLookEditDetail = z.infer<typeof creatorLookEditDetailSchema>;
