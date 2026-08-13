import { z } from "zod";

export const brandProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  type: z.string(),
  categories: z.array(z.string()),
  imageUrl: z.string().nullable(),
  lowStock: z.boolean(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  createdAt: z.string(),
});
export type BrandProduct = z.infer<typeof brandProductSchema>;
