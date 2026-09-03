import { z } from "zod";

import {
  SupportCategory,
  SupportPriority,
  SupportSegment,
  SupportStatus,
  SupportVisibility,
} from "#generated/prisma/enums.js";

import {
  DEFAULT_SUPPORT_PAGE_SIZE,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_SUPPORT_PAGE_SIZE,
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  SUBJECT_MAX_LENGTH,
} from "./support.constants.js";

export const supportCategorySchema = z.enum(SupportCategory);
export const supportStatusSchema = z.enum(SupportStatus);
export const supportPrioritySchema = z.enum(SupportPriority);
export const supportSegmentSchema = z.enum(SupportSegment);

const attachmentUrlsSchema = z
  .array(z.string().trim().min(1).max(2048))
  .max(MAX_ATTACHMENTS_PER_MESSAGE)
  .default([]);

export const createSupportTicketSchema = z.object({
  category: supportCategorySchema,
  subject: z.string().trim().min(3).max(SUBJECT_MAX_LENGTH),
  message: z.string().trim().min(MESSAGE_MIN_LENGTH).max(MESSAGE_MAX_LENGTH),
  attachmentUrls: attachmentUrlsSchema,
  relatedOrderId: z.uuid().nullable().optional().default(null),
});

export const requesterReplySchema = z.object({
  body: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
  attachmentUrls: attachmentUrlsSchema,
});

export const ticketIdParamsSchema = z.object({ id: z.uuid() });

export const reopenTokenParamsSchema = z.object({ token: z.string().min(1).max(256) });

export const mineListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_SUPPORT_PAGE_SIZE)
    .default(DEFAULT_SUPPORT_PAGE_SIZE),
});

export const adminListQuerySchema = z.object({
  status: supportStatusSchema.optional(),
  category: supportCategorySchema.optional(),
  segment: supportSegmentSchema.optional(),
  assigneeUserId: z.uuid().optional(),
  unassigned: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  search: z.string().trim().min(1).max(120).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_SUPPORT_PAGE_SIZE)
    .default(DEFAULT_SUPPORT_PAGE_SIZE),
});

export const adminReplySchema = z.object({
  body: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
  visibility: z.enum(SupportVisibility),
  attachmentUrls: attachmentUrlsSchema,
  moveToWaitingOnCustomer: z.boolean().optional().default(false),
});

export const adminChangeStatusSchema = z.object({
  status: supportStatusSchema,
  expectedStatus: supportStatusSchema,
});

export const adminAssignSchema = z.object({
  assigneeUserId: z.uuid().nullable(),
});

export const adminPrioritySchema = z.object({
  priority: supportPrioritySchema,
});

export type CreateSupportTicketBody = z.infer<typeof createSupportTicketSchema>;
export type RequesterReplyBody = z.infer<typeof requesterReplySchema>;
export type TicketIdParams = z.infer<typeof ticketIdParamsSchema>;
export type ReopenTokenParams = z.infer<typeof reopenTokenParamsSchema>;
export type MineListQuery = z.infer<typeof mineListQuerySchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type AdminReplyBody = z.infer<typeof adminReplySchema>;
export type AdminChangeStatusBody = z.infer<typeof adminChangeStatusSchema>;
export type AdminAssignBody = z.infer<typeof adminAssignSchema>;
export type AdminPriorityBody = z.infer<typeof adminPrioritySchema>;
