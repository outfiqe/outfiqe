import { z } from "zod";

import { MAX_RELATIONSHIP_PAGE_SIZE } from "./crm-relationships.constants.js";

export const relationshipListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_RELATIONSHIP_PAGE_SIZE).optional(),
});

export const creatorIdParamsSchema = z.object({
  creatorId: z.uuid(),
});

export const customerUserIdParamsSchema = z.object({
  userId: z.uuid(),
});

export type RelationshipListQuery = z.infer<typeof relationshipListQuerySchema>;
export type CreatorIdParams = z.infer<typeof creatorIdParamsSchema>;
export type CustomerUserIdParams = z.infer<typeof customerUserIdParamsSchema>;
