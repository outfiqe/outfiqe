import { z } from "zod";

const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
});

export const publicBuildCardSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  previewImageUrls: z.array(z.string()),
  itemCount: z.number(),
  total: z.number(),
  isFullyAvailable: z.boolean(),
  contributors: z.array(personSchema),
  likeCount: z.number(),
  saveCount: z.number(),
  commentCount: z.number(),
  isLiked: z.boolean(),
  isSaved: z.boolean(),
  madePublicAt: z.string().nullable(),
});

export const publicBuildPageSchema = z.object({
  items: z.array(publicBuildCardSchema),
  nextCursor: z.string().nullable(),
});

export const publicBuildItemSchema = z.object({
  slotKey: z.string(),
  slotLabel: z.string(),
  position: z.number(),
  productId: z.string(),
  productName: z.string(),
  imageUrl: z.string().nullable(),
  brandName: z.string(),
  unitPrice: z.number(),
  isInStock: z.boolean(),
});

export const publicBuildDetailSchema = publicBuildCardSchema.extend({
  visibility: z.enum(["SHARED", "PUBLIC"]),
  items: z.array(publicBuildItemSchema),
  lockedAt: z.string(),
  canComment: z.boolean(),
});

export const buildCommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  author: personSchema,
  parentCommentId: z.string().nullable(),
  replyCount: z.number(),
  createdAt: z.string(),
  isMine: z.boolean(),
});

export const buildCommentPageSchema = z.object({
  items: z.array(buildCommentSchema),
  nextCursor: z.string().nullable(),
});

export const likeResultSchema = z.object({ isLiked: z.boolean(), likeCount: z.number() });
export const saveResultSchema = z.object({ isSaved: z.boolean(), saveCount: z.number() });

export type PublicBuildCard = z.infer<typeof publicBuildCardSchema>;
export type PublicBuildPage = z.infer<typeof publicBuildPageSchema>;
export type PublicBuildItem = z.infer<typeof publicBuildItemSchema>;
export type PublicBuildDetail = z.infer<typeof publicBuildDetailSchema>;
export type BuildComment = z.infer<typeof buildCommentSchema>;
export type BuildCommentPage = z.infer<typeof buildCommentPageSchema>;

export type PublicBuildFilters = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  isInStockOnly?: boolean;
  contributorId?: string;
  brandId?: string;
};
