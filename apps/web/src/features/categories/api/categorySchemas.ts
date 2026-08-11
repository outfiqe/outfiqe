import { z } from "zod";

export const publicCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  productCount: z.number(),
});
export type PublicCategory = z.infer<typeof publicCategorySchema>;

export const categoryListSchema = z.array(publicCategorySchema);
