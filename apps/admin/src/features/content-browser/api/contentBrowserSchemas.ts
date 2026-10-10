import { POST_LAYOUT_VALUES } from "@outfiqe/utils";
import { z } from "zod";

export const adminLookCreatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  contentFlagCount: z.number(),
});

export const adminLookSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  layout: z.enum(POST_LAYOUT_VALUES),
  caption: z.string().nullable(),
  creator: adminLookCreatorSchema,
  likeCount: z.number(),
  commentCount: z.number(),
  saveCount: z.number(),
  createdAt: z.string(),
});
export type AdminLook = z.infer<typeof adminLookSchema>;

export const adminLookPageSchema = z.object({
  items: z.array(adminLookSchema),
  nextCursor: z.string().nullable(),
});
export type AdminLookPage = z.infer<typeof adminLookPageSchema>;

export const lookCommentReplySchema = z.object({
  id: z.string(),
  parentCommentId: z.string(),
  userId: z.string(),
  userName: z.string(),
  userHandle: z.string(),
  userAvatarUrl: z.string().nullable(),
  body: z.string(),
  createdAt: z.string(),
});
export type LookCommentReply = z.infer<typeof lookCommentReplySchema>;

export const lookCommentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userHandle: z.string(),
  userAvatarUrl: z.string().nullable(),
  body: z.string(),
  createdAt: z.string(),
  replyCount: z.number(),
  previewReplies: z.array(lookCommentReplySchema),
});
export type LookComment = z.infer<typeof lookCommentSchema>;

export const lookCommentPageSchema = z.object({
  comments: z.array(lookCommentSchema),
  nextCursor: z.string().nullable(),
});
export type LookCommentPage = z.infer<typeof lookCommentPageSchema>;

export const lookCommentReplyPageSchema = z.object({
  replies: z.array(lookCommentReplySchema),
  nextCursor: z.string().nullable(),
});
export type LookCommentReplyPage = z.infer<typeof lookCommentReplyPageSchema>;
