import type { TagReportReason, TagReportSource, TagReportStatus } from "@outfiqe/types";
import { z } from "zod";

const sourceValues = ["PUBLIC_REPORT", "BRAND_COUNTERFEIT_REJECTION"] satisfies TagReportSource[];
const reasonValues = [
  "COUNTERFEIT",
  "NOT_GENUINELY_WORN",
  "MISLEADING",
  "OFFENSIVE",
  "OTHER",
] satisfies TagReportReason[];
const statusValues = ["OPEN", "ACTIONED", "DISMISSED"] satisfies TagReportStatus[];

export const tagReportSourceSchema = z.enum(sourceValues);
export const tagReportReasonSchema = z.enum(reasonValues);
export const tagReportStatusSchema = z.enum(statusValues);
export type TagReportStatusValue = z.infer<typeof tagReportStatusSchema>;

const tagReviewStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const tagReportSchema = z.object({
  id: z.string(),
  source: tagReportSourceSchema,
  reason: tagReportReasonSchema,
  note: z.string().nullable(),
  status: tagReportStatusSchema,
  createdAt: z.string(),
  reviewedAt: z.string().nullable(),
  resolutionNote: z.string().nullable(),
  reporterName: z.string().nullable(),
  tag: z.object({
    id: z.string(),
    lookId: z.string(),
    lookImageUrl: z.string(),
    reviewStatus: tagReviewStatusSchema,
    sizeWorn: z.string().nullable(),
    product: z.object({
      id: z.string(),
      name: z.string(),
      brandId: z.string(),
      brandName: z.string(),
    }),
    creator: z.object({
      id: z.string(),
      name: z.string(),
      handle: z.string(),
      counterfeitFlagCount: z.number(),
    }),
  }),
});
export type TagReport = z.infer<typeof tagReportSchema>;

export const tagReportPageSchema = z.object({
  items: z.array(tagReportSchema),
  nextCursor: z.string().nullable(),
});
export type TagReportPage = z.infer<typeof tagReportPageSchema>;

export const openTagReportCountSchema = z.object({ openCount: z.number() });

export const resolveTagReportSchema = z.object({
  status: z.enum(["ACTIONED", "DISMISSED"]),
  resolutionNote: z.string().trim().min(1).max(500).optional(),
  takeDownTag: z.boolean().optional(),
});
export type ResolveTagReportInput = z.infer<typeof resolveTagReportSchema>;
