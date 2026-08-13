import { z } from "zod";
import type { ProductStatus } from "@outfiqe/types";

const statusValues = ["PENDING", "APPROVED", "REJECTED"] satisfies ProductStatus[];
export const productStatusSchema = z.enum(statusValues);
export type ProductStatusValue = z.infer<typeof productStatusSchema>;

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  type: z.string(),
  categories: z.array(z.string()),
  imageUrl: z.string().nullable(),
  lowStock: z.boolean(),
  status: productStatusSchema,
  createdAt: z.string(),
  brand: z.object({ name: z.string() }),
});
export type Product = z.infer<typeof productSchema>;
