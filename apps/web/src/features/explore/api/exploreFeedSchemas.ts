import { z } from "zod";

export const feedTaggedProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(),
  imageUrl: z.string().nullable(),
});
export type FeedTaggedProduct = z.infer<typeof feedTaggedProductSchema>;

export const feedCreatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  isApproved: z.boolean(),
});
export type FeedCreator = z.infer<typeof feedCreatorSchema>;

export const feedPostSchema = z.object({
  id: z.string(),
  creator: feedCreatorSchema,
  imageUrl: z.string(),
  images: z.array(z.string()),
  caption: z.string().nullable(),
  likeCount: z.number(),
  commentCount: z.number(),
  saveCount: z.number(),
  isLiked: z.boolean(),
  isSaved: z.boolean(),
  isFollowingCreator: z.boolean(),
  taggedProducts: z.array(feedTaggedProductSchema),
  hashtags: z.array(z.string()),
  createdAt: z.string(),
});
export type FeedPost = z.infer<typeof feedPostSchema>;

export const feedPageSchema = z.object({
  posts: z.array(feedPostSchema),
  nextCursor: z.string().nullable(),
});
export type FeedPage = z.infer<typeof feedPageSchema>;

export const trendingTagSchema = z.object({
  tag: z.string(),
  postCount: z.number(),
});
export type TrendingTag = z.infer<typeof trendingTagSchema>;

export const trendingTagsResponseSchema = z.object({ tags: z.array(trendingTagSchema) });

export const suggestedCreatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  isCreator: z.boolean(),
  creatorStatus: z.string(),
  followerCount: z.number(),
});
export type SuggestedCreator = z.infer<typeof suggestedCreatorSchema>;

export const suggestedCreatorsResponseSchema = z.object({
  creators: z.array(suggestedCreatorSchema),
});

export const commentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userHandle: z.string(),
  userAvatarUrl: z.string().nullable(),
  body: z.string(),
  createdAt: z.string(),
});
export type FeedComment = z.infer<typeof commentSchema>;

export const commentPageSchema = z.object({
  comments: z.array(commentSchema),
  nextCursor: z.string().nullable(),
});
export type CommentPage = z.infer<typeof commentPageSchema>;

export const likeResultSchema = z.object({ liked: z.boolean(), likeCount: z.number() });
export const saveResultSchema = z.object({ saved: z.boolean(), saveCount: z.number() });
export const followResultSchema = z.object({ following: z.boolean(), followerCount: z.number() });
