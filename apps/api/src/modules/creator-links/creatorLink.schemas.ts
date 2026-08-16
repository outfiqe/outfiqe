import { z } from "zod";

import { SESSION_ID_MAX } from "#constants/commerce.constants.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const createInternalLinkSchema = z.object({ productId: z.uuid() });
export type CreateInternalLinkBody = z.infer<typeof createInternalLinkSchema>;

export const createExternalLinkSchema = z.object({ productId: z.uuid().optional() });
export type CreateExternalLinkBody = z.infer<typeof createExternalLinkSchema>;

export const listMyLinksQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ListMyLinksQuery = z.infer<typeof listMyLinksQuerySchema>;

export const linkTokenParamSchema = z.object({ token: z.string().min(1) });
export type LinkTokenParam = z.infer<typeof linkTokenParamSchema>;

export const recordLinkClickSchema = z.object({
  sessionId: z.string().min(1).max(SESSION_ID_MAX),
});
export type RecordLinkClickBody = z.infer<typeof recordLinkClickSchema>;
