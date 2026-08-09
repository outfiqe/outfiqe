import { z } from "zod";

export const creatorProfileSchema = z.object({
  userId: z.string(),
  name: z.string(),
  handle: z.string(),
  heightCm: z.number().nullable(),
  creatorStatus: z.string(),
  postsCount: z.number(),
  followerCount: z.number(),
  taggedPiecesCount: z.number(),
  isFollowing: z.boolean(),
});
export type CreatorProfile = z.infer<typeof creatorProfileSchema>;
