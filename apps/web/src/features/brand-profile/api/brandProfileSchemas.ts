import { z } from "zod";

import { responsiveImageSchema } from "@/shared/lib/responsiveImage";

export const brandProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.url().nullable(),
  avatarImage: responsiveImageSchema.nullish(),
  bannerUrl: z.url().nullable(),
  bannerImage: responsiveImageSchema.nullish(),
  madeInNepal: z.boolean(),
  rating: z.number().nullable(),
  productCount: z.number(),
  followerCount: z.number(),
  isFollowing: z.boolean(),
  contactUserId: z.string().nullable(),
});
export type BrandProfile = z.infer<typeof brandProfileSchema>;
