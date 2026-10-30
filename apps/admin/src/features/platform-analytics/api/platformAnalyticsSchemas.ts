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

export const overviewResultSchema = insightResultSchema(overviewInsightSchema);
export const purchaseFunnelResultSchema = insightResultSchema(purchaseFunnelInsightSchema);
export const lookToOrderResultSchema = insightResultSchema(lookToOrderInsightSchema);
export const acquisitionResultSchema = insightResultSchema(acquisitionInsightSchema);
export const retentionResultSchema = insightResultSchema(retentionInsightSchema);
export const zeroResultSearchesResultSchema = insightResultSchema(zeroResultSearchesInsightSchema);

export type FunnelStep = z.infer<typeof funnelStepSchema>;
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
