import { z } from "zod";

export const productTypeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  productCount: z.number(),
  sizeOptionCount: z.number(),
});
export type ProductType = z.infer<typeof productTypeSchema>;
