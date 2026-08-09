import { z } from "zod";

export const brandProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  madeInNepal: z.boolean(),
  rating: z.number().nullable(),
  productCount: z.number(),
  followerCount: z.number(),
  isFollowing: z.boolean(),
});
export type BrandProfile = z.infer<typeof brandProfileSchema>;
