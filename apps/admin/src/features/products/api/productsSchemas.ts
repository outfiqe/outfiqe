import type { ProductStatus } from "@outfiqe/types";
import { THRIFT_CONDITION_VALUES } from "@outfiqe/utils";
import { z } from "zod";

const statusValues = ["PENDING", "APPROVED", "REJECTED"] satisfies ProductStatus[];
export const productStatusSchema = z.enum(statusValues);
export type ProductStatusValue = z.infer<typeof productStatusSchema>;

export const thriftConditionSchema = z.enum(THRIFT_CONDITION_VALUES);

const fitRangeSchema = z.object({
  minHeightCm: z.number(),
  maxHeightCm: z.number(),
  minWeightKg: z.number(),
  maxWeightKg: z.number(),
});

const reviewProductSizeSchema = z.object({
  id: z.string(),
  label: z.string(),
  stock: z.number(),
  fitRange: fitRangeSchema.nullable(),
});

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  productType: z.object({
    slug: z.string(),
    label: z.string(),
    supportsFitRanges: z.boolean(),
  }),
  sizes: z.array(reviewProductSizeSchema),
  isStretchable: z.boolean().nullable(),
  categories: z.array(z.string()),
  imageUrl: z.string().nullable(),
  lowStock: z.boolean(),
  status: productStatusSchema,
  createdAt: z.string(),
  brand: z.object({ name: z.string() }),
  isThrift: z.boolean(),
  thriftConditionRating: thriftConditionSchema.nullable(),
  thriftConditionNotes: z.string().nullable(),
});
export type Product = z.infer<typeof productSchema>;
