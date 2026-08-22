import { z } from "zod";

import { SESSION_ID_MAX } from "#constants/commerce.constants.js";
import { SEARCH_QUERY_MAX_LENGTH } from "#constants/search.constants.js";

const CAPTION_MAX = 280;
const MIN_TAGGED_PRODUCTS = 0;
const MAX_TAGGED_PRODUCTS = 6;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const SIZE_WORN_MAX = 20;
const MIN_IMAGES = 1;
const MAX_IMAGES = 6;

export const taggedProductInputSchema = z.object({
  productId: z.uuid(),
  sizeWorn: z.string().min(1).max(SIZE_WORN_MAX),
});

export const createCreatorLookSchema = z.object({
  imageUrls: z.array(z.url()).min(MIN_IMAGES).max(MAX_IMAGES),
  caption: z.string().max(CAPTION_MAX).optional(),
  taggedProducts: z
    .array(taggedProductInputSchema)
    .min(MIN_TAGGED_PRODUCTS)
    .max(MAX_TAGGED_PRODUCTS),
});

export const listCreatorLooksQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

const COMMENT_BODY_MAX = 1000;
const DEFAULT_FEED_PAGE_SIZE = 12;
const MAX_FEED_PAGE_SIZE = 30;
const DEFAULT_COMMENT_PAGE_SIZE = 20;
const MAX_COMMENT_PAGE_SIZE = 50;

export const lookIdParamsSchema = z.object({
  lookId: z.uuid(),
});

export const tagClickParamsSchema = z.object({
  lookId: z.uuid(),
  productId: z.uuid(),
});

export const searchCreatorLooksQuerySchema = z.object({
  q: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_FEED_PAGE_SIZE).default(DEFAULT_FEED_PAGE_SIZE),
});

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH),
});

export const feedQuerySchema = z.object({
  tab: z.string().default("for_you"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_FEED_PAGE_SIZE).default(DEFAULT_FEED_PAGE_SIZE),
});

export const listSavedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_FEED_PAGE_SIZE).default(DEFAULT_FEED_PAGE_SIZE),
});

const TAB_MAX = 60;

export const feedSyncRequestSchema = z.object({
  tab: z.string().min(1).max(TAB_MAX),
  since: z.iso.datetime(),
});

export const commentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_COMMENT_PAGE_SIZE)
    .default(DEFAULT_COMMENT_PAGE_SIZE),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(COMMENT_BODY_MAX).trim(),
});

export const tagClickSchema = z.object({
  sessionId: z.string().min(1).max(SESSION_ID_MAX),
  source: z.enum(["FEED", "PRODUCT_PAGE"]).default("FEED"),
});

export const recordViewSchema = z.object({
  sessionId: z.string().min(1).max(SESSION_ID_MAX),
});

export type CreateCreatorLookBody = z.infer<typeof createCreatorLookSchema>;
export type ListCreatorLooksQuery = z.infer<typeof listCreatorLooksQuerySchema>;
export type LookIdParams = z.infer<typeof lookIdParamsSchema>;
export type TagClickParams = z.infer<typeof tagClickParamsSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type SearchCreatorLooksQuery = z.infer<typeof searchCreatorLooksQuerySchema>;
export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>;
export type ListSavedQuery = z.infer<typeof listSavedQuerySchema>;
export type FeedSyncRequest = z.infer<typeof feedSyncRequestSchema>;
export type CommentsQuery = z.infer<typeof commentsQuerySchema>;
export type CreateCommentBody = z.infer<typeof createCommentSchema>;
export type TagClickBody = z.infer<typeof tagClickSchema>;
export type RecordViewBody = z.infer<typeof recordViewSchema>;
