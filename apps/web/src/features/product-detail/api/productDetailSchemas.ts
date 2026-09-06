import { z } from "zod";

import { productTypeSchema } from "@/features/products/api/productSchemas";

export const productSizeSchema = z.object({
  id: z.string(),
  label: z.string(),
  inStock: z.boolean(),
});
export type ProductSize = z.infer<typeof productSizeSchema>;

export const seenOnCreatorSchema = z.object({
  creatorId: z.string(),
  name: z.string(),
  handle: z.string(),
  heightCm: z.number().nullable(),
  sizeWorn: z.string().nullable(),
  lookId: z.string(),
  lookImageUrl: z.string(),
});
export type SeenOnCreator = z.infer<typeof seenOnCreatorSchema>;

export const productRatingSummarySchema = z.object({
  avgRating: z.number().nullable(),
  reviewCount: z.number(),
  rating1Count: z.number(),
  rating2Count: z.number(),
  rating3Count: z.number(),
  rating4Count: z.number(),
  rating5Count: z.number(),
});
export type ProductRatingSummary = z.infer<typeof productRatingSummarySchema>;

export const productDetailSchema = z
  .object({
    id: z.string(),
    brand: z.object({ id: z.string(), name: z.string() }),
    name: z.string(),
    price: z.number(),
    effectivePrice: z.number(),
    discountPercent: z.number().nullable(),
    type: productTypeSchema,
    categorySlugs: z.array(z.string()),
    imageUrl: z.string().nullable(),
    lowStock: z.boolean(),
    isNew: z.boolean(),
    sizes: z.array(productSizeSchema),
    images: z.array(z.string()),
    wornByCount: z.number(),
    seenOnCreators: z.array(seenOnCreatorSchema),
    isSaved: z.boolean(),
  })
  .extend(productRatingSummarySchema.shape);
export type ProductDetail = z.infer<typeof productDetailSchema>;
