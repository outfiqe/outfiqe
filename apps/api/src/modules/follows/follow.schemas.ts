import { z } from "zod";

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
