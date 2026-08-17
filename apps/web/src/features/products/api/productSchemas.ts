import { PRODUCT_TYPE_SLUGS } from "@outfiqe/utils";
import { z } from "zod";

export const productTypeSchema = z.enum(PRODUCT_TYPE_SLUGS);

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
});
export type PublicProduct = z.infer<typeof publicProductSchema>;

export const productPageSchema = z.object({
  products: z.array(publicProductSchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
  brandCount: z.number(),
});
export type ProductPage = z.infer<typeof productPageSchema>;
