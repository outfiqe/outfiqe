import { z } from "zod";

export const brandProductSizeSchema = z.object({
  id: z.string(),
  label: z.string(),
  stock: z.number(),
});
export type BrandProductSize = z.infer<typeof brandProductSizeSchema>;

export const brandProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  type: z.string(),
  categories: z.array(z.string()),
  categorySlugs: z.array(z.string()),
  imageUrl: z.string().nullable(),
  imageUrls: z.array(z.string()),
  lowStock: z.boolean(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  createdAt: z.string(),
  sizes: z.array(brandProductSizeSchema),
});
export type BrandProduct = z.infer<typeof brandProductSchema>;
