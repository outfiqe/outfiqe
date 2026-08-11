import { z } from "zod";

import { CreatorStatus } from "../../generated/prisma/enums.js";

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

export const listCreatorLooksQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type ListCreatorsQuery = z.infer<typeof listCreatorsQuerySchema>;
export type CreatorUserIdParam = z.infer<typeof creatorUserIdParamSchema>;
export type CreatorHandleParam = z.infer<typeof creatorHandleParamSchema>;
export type ListCreatorLooksQuery = z.infer<typeof listCreatorLooksQuerySchema>;
