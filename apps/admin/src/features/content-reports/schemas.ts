import type { ContentReportReason, ContentReportStatus, ContentReportTarget } from "@outfiqe/types";
import { z } from "zod";

const targetTypeValues = ["CREATOR_LOOK", "CREATOR_LOOK_COMMENT"] satisfies ContentReportTarget[];
const reasonValues = [
  "SPAM",
  "HARASSMENT_OR_BULLYING",
  "HATE_SPEECH",
  "NUDITY_OR_SEXUAL_CONTENT",
  "VIOLENCE_OR_DANGEROUS_ACTS",
  "SCAM_OR_MISLEADING",
  "INTELLECTUAL_PROPERTY",
  "OTHER",
] satisfies ContentReportReason[];
const statusValues = ["OPEN", "ACTIONED", "DISMISSED"] satisfies ContentReportStatus[];

export const contentReportTargetTypeSchema = z.enum(targetTypeValues);
export const contentReportReasonSchema = z.enum(reasonValues);
export const contentReportStatusSchema = z.enum(statusValues);
export type ContentReportStatusValue = z.infer<typeof contentReportStatusSchema>;

export const contentReportTargetPreviewSchema = z.object({
  lookId: z.string(),
  imageUrl: z.string().nullable(),
  snippet: z.string(),
  isRemoved: z.boolean(),
  author: z.object({
    id: z.string(),
    name: z.string(),
    handle: z.string(),
    contentFlagCount: z.number(),
  }),
});

export const contentReportSchema = z.object({
  id: z.string(),
  targetType: contentReportTargetTypeSchema,
  targetId: z.string(),
  reason: contentReportReasonSchema,
  note: z.string().nullable(),
  status: contentReportStatusSchema,
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolutionNote: z.string().nullable(),
  reporterName: z.string().nullable(),
  target: contentReportTargetPreviewSchema.nullable(),
});
export type ContentReport = z.infer<typeof contentReportSchema>;

export const contentReportPageSchema = z.object({
  items: z.array(contentReportSchema),
  nextCursor: z.string().nullable(),
});
export type ContentReportPage = z.infer<typeof contentReportPageSchema>;

export const openContentReportCountSchema = z.object({ openCount: z.number() });

export const resolveContentReportSchema = z.object({
  action: z.enum(["DISMISS", "REMOVE_CONTENT"]),
  note: z.string().trim().min(1).max(500).optional(),
});
export type ResolveContentReportInput = z.infer<typeof resolveContentReportSchema>;
