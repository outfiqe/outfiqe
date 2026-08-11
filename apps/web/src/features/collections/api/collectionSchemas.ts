import { z } from "zod";

import { publicProductSchema } from "@/features/products/api/productSchemas";

export const publicCollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  productCount: z.number(),
});
export type PublicCollection = z.infer<typeof publicCollectionSchema>;

export const collectionPageSchema = z.object({
  collections: z.array(publicCollectionSchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
});
export type CollectionPage = z.infer<typeof collectionPageSchema>;

export const collectionProductPageSchema = z.object({
  products: z.array(publicProductSchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
});
export type CollectionProductPage = z.infer<typeof collectionProductPageSchema>;
