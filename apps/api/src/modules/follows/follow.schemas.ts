import { z } from "zod";

import { MAX_SUGGESTED_CREATORS_PAGE_SIZE, SUGGESTED_CREATORS_LIMIT } from "./follow.constants.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const followTargetTypeParamSchema = z.enum(["user", "brand"]);
export type FollowTargetTypeParam = z.infer<typeof followTargetTypeParamSchema>;

export const followParamsSchema = z.object({
  targetType: followTargetTypeParamSchema,
  targetId: z.uuid(),
});

export type FollowParams = z.infer<typeof followParamsSchema>;

export const listFollowersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type ListFollowersQuery = z.infer<typeof listFollowersQuerySchema>;

export const followingUserIdParamSchema = z.object({ userId: z.uuid() });
export type FollowingUserIdParam = z.infer<typeof followingUserIdParamSchema>;

export const listSuggestedCreatorsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_SUGGESTED_CREATORS_PAGE_SIZE)
    .default(SUGGESTED_CREATORS_LIMIT),
});

export type ListSuggestedCreatorsQuery = z.infer<typeof listSuggestedCreatorsQuerySchema>;
