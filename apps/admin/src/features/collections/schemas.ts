import { z } from "zod";
import type { CollectionStatus } from "@outfiqe/types";

const statusValues = ["DRAFT", "PUBLISHED"] satisfies CollectionStatus[];
export const collectionStatusSchema = z.enum(statusValues);
export type CollectionStatusValue = z.infer<typeof collectionStatusSchema>;

export const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  status: collectionStatusSchema,
  sortOrder: z.number(),
  productCount: z.number(),
});
export type Collection = z.infer<typeof collectionSchema>;

export const productSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(),
});
export type ProductSearchResult = z.infer<typeof productSearchResultSchema>;
