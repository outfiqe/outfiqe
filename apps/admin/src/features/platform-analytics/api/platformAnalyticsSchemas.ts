import { z } from "zod";

import { INSIGHT_STATUSES } from "../constants/platformAnalytics.constants";

const insightResultSchema = <InsightSchema extends z.ZodType>(insightSchema: InsightSchema) =>
  z.object({
    status: z.enum(INSIGHT_STATUSES),
    refreshedAt: z.string().nullable(),
    posthogUrl: z.string().nullable(),
    insight: insightSchema.nullable(),
  });

const funnelStepSchema = z.object({ event: z.string(), persons: z.number() });

export const overviewInsightSchema = z.object({
  visitors: z.number(),
  signups: z.number(),
  buyers: z.number(),
  orders: z.number(),
  visitToBuyerRate: z.number(),
});

export const purchaseFunnelInsightSchema = z.object({
  steps: z.array(funnelStepSchema),
  ordersByPaymentMethod: z.array(z.object({ paymentMethod: z.string(), orders: z.number() })),
});

export const lookToOrderInsightSchema = z.object({
  steps: z.array(funnelStepSchema),
  attributedOrders: z.number(),
  topCreatorsByLookViews: z.array(
    z.object({
      creatorId: z.string(),
      creatorName: z.string().nullable(),
      creatorHandle: z.string().nullable(),
      lookViews: z.number(),
    }),
  ),
});

export const acquisitionInsightSchema = z.object({
  sources: z.array(z.object({ source: z.string(), visitors: z.number() })),
  campaigns: z.array(z.object({ campaign: z.string(), visitors: z.number() })),
  creatorLinkClicks: z.number(),
});

export const retentionInsightSchema = z.object({
  weeklyActiveVisitors: z.array(z.object({ weekStart: z.string(), visitors: z.number() })),
  buyers: z.number(),
  repeatBuyers: z.number(),
  repeatPurchaseRate: z.number(),
});

export const zeroResultSearchesInsightSchema = z.object({
  searches: z.array(z.object({ query: z.string(), searchCount: z.number() })),
});

const rankedPageSchema = z.object({
  path: z.string(),
  productName: z.string().nullable(),
  brandName: z.string().nullable().default(null),
  count: z.number(),
});

export const siteTrafficInsightSchema = z.object({
  pageViews: z.number(),
  sessions: z.number(),
  averageSessionSeconds: z.number(),
  bounceRate: z.number(),
  topPages: z.array(rankedPageSchema),
  entryPages: z.array(rankedPageSchema),
  exitPages: z.array(rankedPageSchema),
});

const speedReadingSchema = z.object({
  sampleCount: z.number(),
  p75: z.number().nullable(),
  p90: z.number().nullable(),
  p95: z.number().nullable(),
  p99: z.number().nullable(),
});
export type SpeedReading = z.infer<typeof speedReadingSchema>;

const slowPageSchema = z.object({
  path: z.string(),
  productName: z.string().nullable(),
  brandName: z.string().nullable(),
  typicalLoadMs: z.number(),
  sampleCount: z.number(),
});

export const siteSpeedInsightSchema = z.object({
  measurementCount: z.number(),
  largestContentfulPaint: speedReadingSchema,
  interactionToNextPaint: speedReadingSchema,
  firstContentfulPaint: speedReadingSchema,
  cumulativeLayoutShift: speedReadingSchema,
  slowestPages: z.array(slowPageSchema),
});

export const overviewResultSchema = insightResultSchema(overviewInsightSchema);
export const purchaseFunnelResultSchema = insightResultSchema(purchaseFunnelInsightSchema);
export const lookToOrderResultSchema = insightResultSchema(lookToOrderInsightSchema);
export const acquisitionResultSchema = insightResultSchema(acquisitionInsightSchema);
export const retentionResultSchema = insightResultSchema(retentionInsightSchema);
export const zeroResultSearchesResultSchema = insightResultSchema(zeroResultSearchesInsightSchema);
export const siteTrafficResultSchema = insightResultSchema(siteTrafficInsightSchema);
export const siteSpeedResultSchema = insightResultSchema(siteSpeedInsightSchema);

export type FunnelStep = z.infer<typeof funnelStepSchema>;
export type RankedPage = z.infer<typeof rankedPageSchema>;
export type OverviewResult = z.infer<typeof overviewResultSchema>;
export type PurchaseFunnelResult = z.infer<typeof purchaseFunnelResultSchema>;
export type LookToOrderResult = z.infer<typeof lookToOrderResultSchema>;
export type AcquisitionResult = z.infer<typeof acquisitionResultSchema>;
export type RetentionResult = z.infer<typeof retentionResultSchema>;
export type ZeroResultSearchesResult = z.infer<typeof zeroResultSearchesResultSchema>;
export type InsightResult = {
  status: (typeof INSIGHT_STATUSES)[number];
  refreshedAt: string | null;
  posthogUrl: string | null;
};
