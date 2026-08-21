import { z } from "zod";

import { SEARCH_QUERY_MAX_LENGTH } from "#constants/search.constants.js";
import { CreatorStatus } from "#generated/prisma/enums.js";

import { MAX_HEIGHT_CM, MIN_HEIGHT_CM } from "./creator.constants.js";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

export const creatorStatusSchema = z.enum(CreatorStatus);

export const listCreatorsQuerySchema = z.object({
  status: creatorStatusSchema.optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const creatorUserIdParamSchema = z.object({
  userId: z.uuid(),
});

export const creatorHandleParamSchema = z.object({
  handle: z.string().min(1),
});

export const updateCreatorProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    avatarUrl: z.url().nullable(),
    heightCm: z.number().int().min(MIN_HEIGHT_CM).max(MAX_HEIGHT_CM).nullable(),
    showHeight: z.boolean(),
    hideFromLeaderboards: z.boolean(),
  })
  .partial();

export const searchCreatorsQuerySchema = z.object({
  q: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const autocompleteQuerySchema = z.object({
  q: z.string().trim().min(1).max(SEARCH_QUERY_MAX_LENGTH),
});

export const listCreatorLooksQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type ListCreatorsQuery = z.infer<typeof listCreatorsQuerySchema>;
export type SearchCreatorsQuery = z.infer<typeof searchCreatorsQuerySchema>;
export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>;
export type CreatorUserIdParam = z.infer<typeof creatorUserIdParamSchema>;
export type CreatorHandleParam = z.infer<typeof creatorHandleParamSchema>;
export type ListCreatorLooksQuery = z.infer<typeof listCreatorLooksQuerySchema>;
export type UpdateCreatorProfileBody = z.infer<typeof updateCreatorProfileSchema>;
