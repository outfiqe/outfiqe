import { z } from "zod";

import { featuredBadgeSchema } from "@/features/creator-dashboard/api/badgeSchemas";

export const creatorProfileSchema = z.object({
  userId: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.url().nullable(),
  heightCm: z.number().nullable(),
  showHeight: z.boolean(),
  hideFromLeaderboards: z.boolean(),
  creatorStatus: z.string(),
  postsCount: z.number(),
  followerCount: z.number(),
  followingCount: z.number(),
  taggedPiecesCount: z.number(),
  isFollowing: z.boolean(),
  featuredBadges: z.array(featuredBadgeSchema),
  titleBadge: featuredBadgeSchema.nullable(),
});
export type CreatorProfile = z.infer<typeof creatorProfileSchema>;
