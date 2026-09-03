import { z } from "zod";

export const productTypeSchema = z.string();

export const publicProductSchema = z.object({
  id: z.string(),
  brand: z.string(),
  name: z.string(),
  price: z.number(),
  type: productTypeSchema,
  categorySlugs: z.array(z.string()),
  imageUrl: z.string().nullable(),
  lowStock: z.boolean(),
  isNew: z.boolean(),
  creatorBuyerCount: z.number(),
  unitsSold: z.number(),
  avgRating: z.number().nullable(),
  reviewCount: z.number(),
});
export type PublicProduct = z.infer<typeof publicProductSchema>;

export const productSuggestionSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  imageUrl: z.string().nullable(),
});
export type ProductSuggestion = z.infer<typeof productSuggestionSchema>;

export const productPageSchema = z.object({
  products: z.array(publicProductSchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
  brandCount: z.number(),
});
export type ProductPage = z.infer<typeof productPageSchema>;
