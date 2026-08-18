import { z } from "zod";

import { feedPostSchema } from "@/features/explore/api/exploreFeedSchemas";

export const creatorSearchResultSchema = z.object({
  userId: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
  followerCount: z.number(),
});
export type CreatorSearchResult = z.infer<typeof creatorSearchResultSchema>;

export const creatorSearchPageSchema = z.object({
  creators: z.array(creatorSearchResultSchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
});
export type CreatorSearchPage = z.infer<typeof creatorSearchPageSchema>;

export const lookSearchPageSchema = z.object({
  posts: z.array(feedPostSchema),
  nextCursor: z.string().nullable(),
  total: z.number(),
});
export type LookSearchPage = z.infer<typeof lookSearchPageSchema>;
