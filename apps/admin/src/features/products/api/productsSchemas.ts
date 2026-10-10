import type { ProductStatus } from "@outfiqe/types";
import { THRIFT_CONDITION_VALUES } from "@outfiqe/utils";
import { z } from "zod";

const statusValues = ["PENDING", "APPROVED", "REJECTED"] satisfies ProductStatus[];
export const productStatusSchema = z.enum(statusValues);
export type ProductStatusValue = z.infer<typeof productStatusSchema>;

export const thriftConditionSchema = z.enum(THRIFT_CONDITION_VALUES);

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  productType: z.object({ slug: z.string(), label: z.string() }),
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
