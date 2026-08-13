import { z } from "zod";

export const brandProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.url().nullable(),
  bannerUrl: z.url().nullable(),
  madeInNepal: z.boolean(),
  rating: z.number().nullable(),
  productCount: z.number(),
  followerCount: z.number(),
  isFollowing: z.boolean(),
});
export type BrandProfile = z.infer<typeof brandProfileSchema>;
