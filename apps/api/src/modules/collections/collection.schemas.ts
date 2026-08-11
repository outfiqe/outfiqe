import { z } from "zod";
import type { CollectionStatus } from "@outfiqe/shared-types";

const NAME_MIN = 2;
const NAME_MAX = 80;
const DESCRIPTION_MAX = 280;
const SLUG_MAX = 80;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const statusValues = ["DRAFT", "PUBLISHED"] satisfies CollectionStatus[];
export const collectionStatusSchema = z.enum(statusValues);

export const collectionSlugSchema = z
  .string()
  .trim()
  .min(NAME_MIN)
  .max(SLUG_MAX)
  .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only.");

export const createCollectionSchema = z.object({
  name: z.string().trim().min(NAME_MIN).max(NAME_MAX),
  slug: collectionSlugSchema,
  description: z.string().trim().max(DESCRIPTION_MAX).optional(),
  imageUrl: z.url().optional(),
  status: collectionStatusSchema.optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export const setCollectionProductsSchema = z.object({
  productIds: z.array(z.uuid()).max(200),
});

export const collectionIdParamSchema = z.object({ id: z.uuid() });
export const collectionSlugParamSchema = z.object({ slug: z.string().trim().min(1) });

export const listCollectionsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const listCollectionProductsQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type CreateCollectionBody = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionBody = z.infer<typeof updateCollectionSchema>;
export type SetCollectionProductsBody = z.infer<typeof setCollectionProductsSchema>;
export type CollectionIdParam = z.infer<typeof collectionIdParamSchema>;
export type CollectionSlugParam = z.infer<typeof collectionSlugParamSchema>;
export type ListCollectionsQuery = z.infer<typeof listCollectionsQuerySchema>;
export type ListCollectionProductsQuery = z.infer<typeof listCollectionProductsQuerySchema>;
