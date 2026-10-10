import type { BrandTagReviewPolicy, TagApprovalSource, TagRejectionReason } from "@outfiqe/types";
import { z } from "zod";

const policyValues = ["OPEN", "TRUSTED_ONLY", "APPROVAL_REQUIRED"] satisfies BrandTagReviewPolicy[];
const sourceValues = [
  "BRAND",
  "POLICY_OPEN",
  "TRUSTED_CREATOR",
  "VERIFIED_BUYER",
  "SLA",
  "GRANDFATHERED",
] satisfies TagApprovalSource[];
const reasonValues = [
  "NOT_OUR_PRODUCT",
  "COUNTERFEIT_SUSPECTED",
  "MISREPRESENTS_PRODUCT",
  "POLICY_VIOLATION",
  "OTHER",
] satisfies TagRejectionReason[];

const periodTrendSchema = z.object({
  value: z.number().nullable(),
  previousValue: z.number().nullable(),
  deltaPercent: z.number().nullable(),
});
export type PeriodTrend = z.infer<typeof periodTrendSchema>;

export const tagReviewMetricsSchema = z.object({
  overview: z.object({
    tagsLive: periodTrendSchema,
    manualReviewRatePercent: periodTrendSchema,
    medianTimeToLiveHours: periodTrendSchema,
    openIssues: z.object({ count: z.number(), newLast7d: z.number() }),
  }),
  reviewLatencyByPolicy: z.array(
    z.object({
      policy: z.enum(policyValues),
      decidedCount: z.number(),
      p50Hours: z.number().nullable(),
      p90Hours: z.number().nullable(),
    }),
  ),
  approvalSourceMix: z.array(z.object({ source: z.enum(sourceValues), count: z.number() })),
  rejectionReasonMix: z.array(z.object({ reason: z.enum(reasonValues), count: z.number() })),
  timeToFirstShoppable: z.object({
    looksWithApprovedTag: z.number(),
    p50Hours: z.number().nullable(),
    p90Hours: z.number().nullable(),
  }),
  stuckApprovalRequiredCount: z.number(),
  reports: z.object({ open: z.number(), last30Days: z.number() }),
});
export type TagReviewMetrics = z.infer<typeof tagReviewMetricsSchema>;
