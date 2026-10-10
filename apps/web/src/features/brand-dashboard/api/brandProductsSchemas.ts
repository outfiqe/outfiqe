import { z } from "zod";

import { thriftConditionSchema } from "@/features/products/api/productSchemas";

export const fitRangeSchema = z.object({
  minHeightCm: z.number(),
  maxHeightCm: z.number(),
  minWeightKg: z.number(),
  maxWeightKg: z.number(),
});

export const brandProductSizeSchema = z.object({
  id: z.string(),
  label: z.string(),
  stock: z.number(),
  fitRange: fitRangeSchema.nullable().default(null),
});
export type BrandProductSize = z.infer<typeof brandProductSizeSchema>;

export const productDiscountSchema = z.object({
  id: z.string(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  percentBasisPoints: z.number().nullable(),
  fixedAmount: z.number().nullable(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
});
export type ProductDiscount = z.infer<typeof productDiscountSchema>;

export const brandProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  effectivePrice: z.number(),
  activeDiscount: productDiscountSchema.nullable(),
  type: z.string(),
  categories: z.array(z.string()),
  categorySlugs: z.array(z.string()),
  imageUrl: z.string().nullable(),
  imageUrls: z.array(z.string()),
  lowStock: z.boolean(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  createdAt: z.string(),
  sizes: z.array(brandProductSizeSchema),
  sizeStandardId: z.string().nullable(),
  isStretchable: z.boolean().nullable(),
  isThrift: z.boolean(),
  thriftConditionRating: thriftConditionSchema.nullable(),
  thriftConditionNotes: z.string().nullable(),
  isSoldOut: z.boolean(),
});
export type BrandProduct = z.infer<typeof brandProductSchema>;

export const brandProductPageSchema = z.object({
  products: z.array(brandProductSchema),
  nextCursor: z.string().nullable(),
});
export type BrandProductPage = z.infer<typeof brandProductPageSchema>;
