import { z } from "zod";

import { BrandUnavailableRequestStatus } from "#generated/prisma/enums.js";

import { refundLinesSchema, refundReasonSchema } from "../refunds/refund.schemas.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const reportUnavailableItemsSchema = z.object({
  lines: refundLinesSchema,
  reason: refundReasonSchema,
});

export const listUnavailableItemsQuerySchema = z.object({
  status: z.enum(BrandUnavailableRequestStatus).default(BrandUnavailableRequestStatus.PENDING),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const unavailableRequestIdParamSchema = z.object({ requestId: z.uuid() });

export const rejectUnavailableItemSchema = z.object({ note: refundReasonSchema });

export type ReportUnavailableItemsBody = z.infer<typeof reportUnavailableItemsSchema>;
export type ListUnavailableItemsQuery = z.infer<typeof listUnavailableItemsQuerySchema>;
export type UnavailableRequestIdParam = z.infer<typeof unavailableRequestIdParamSchema>;
export type RejectUnavailableItemBody = z.infer<typeof rejectUnavailableItemSchema>;
