import { z } from "zod";

import {
  ContentReportReason,
  ContentReportStatus,
  ContentReportTarget,
} from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const NOTE_MAX = 500;

export const CONTENT_REPORT_RESOLUTION_ACTION = {
  DISMISS: "DISMISS",
  REMOVE_CONTENT: "REMOVE_CONTENT",
} as const;

export const submitContentReportSchema = z
  .object({
    targetType: z.enum(ContentReportTarget),
    targetId: z.uuid(),
    reason: z.enum(ContentReportReason),
    note: z.string().trim().min(1).max(NOTE_MAX).optional(),
  })
  .refine((body) => body.reason !== ContentReportReason.OTHER || Boolean(body.note), {
    error: "Tell us what's wrong with this.",
    path: ["note"],
  });

export const listContentReportsQuerySchema = z.object({
  status: z.enum(ContentReportStatus).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const contentReportIdParamSchema = z.object({ id: z.uuid() });

export const resolveContentReportSchema = z.object({
  action: z.enum([
    CONTENT_REPORT_RESOLUTION_ACTION.DISMISS,
    CONTENT_REPORT_RESOLUTION_ACTION.REMOVE_CONTENT,
  ]),
  note: z.string().trim().min(1).max(NOTE_MAX).optional(),
});

export type SubmitContentReportBody = z.infer<typeof submitContentReportSchema>;
export type ListContentReportsQuery = z.infer<typeof listContentReportsQuerySchema>;
export type ContentReportIdParam = z.infer<typeof contentReportIdParamSchema>;
export type ResolveContentReportBody = z.infer<typeof resolveContentReportSchema>;
