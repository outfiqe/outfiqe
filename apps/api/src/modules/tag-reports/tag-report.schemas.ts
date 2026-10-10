import { z } from "zod";

import { TagReportReason, TagReportStatus } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const NOTE_MAX = 500;

export const submitTagReportSchema = z
  .object({
    lookId: z.uuid(),
    productId: z.uuid(),
    reason: z.enum(TagReportReason),
    note: z.string().trim().min(1).max(NOTE_MAX).optional(),
  })
  .refine((body) => body.reason !== TagReportReason.OTHER || Boolean(body.note), {
    error: "Tell us what's wrong with this tag.",
    path: ["note"],
  });

export const listTagReportsQuerySchema = z.object({
  status: z.enum(TagReportStatus).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const tagReportIdParamSchema = z.object({ id: z.uuid() });

export const resolveTagReportSchema = z.object({
  status: z.enum([TagReportStatus.ACTIONED, TagReportStatus.DISMISSED]),
  resolutionNote: z.string().trim().min(1).max(NOTE_MAX).optional(),
  takeDownTag: z.boolean().default(false),
});

export type SubmitTagReportBody = z.infer<typeof submitTagReportSchema>;
export type ListTagReportsQuery = z.infer<typeof listTagReportsQuerySchema>;
export type TagReportIdParam = z.infer<typeof tagReportIdParamSchema>;
export type ResolveTagReportBody = z.infer<typeof resolveTagReportSchema>;
