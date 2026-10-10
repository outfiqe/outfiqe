import { z } from "zod";

export const pipelineStageReportRowSchema = z.object({
  stageId: z.string(),
  stageName: z.string(),
  sortOrder: z.number(),
  isWon: z.boolean(),
  isLost: z.boolean(),
  openDealCount: z.number(),
  openValue: z.number(),
  wonDealCount: z.number(),
  wonValue: z.number(),
  lostDealCount: z.number(),
});

export const pipelineReportSchema = z.object({
  stages: z.array(pipelineStageReportRowSchema),
  totals: z.object({
    openDealCount: z.number(),
    openValue: z.number(),
    wonDealCount: z.number(),
    wonValue: z.number(),
    lostDealCount: z.number(),
  }),
});
export type PipelineReport = z.infer<typeof pipelineReportSchema>;

export const ticketReportSchema = z.object({
  statusCounts: z.array(z.object({ status: z.string(), count: z.number() })),
  openCount: z.number(),
  resolvedCount: z.number(),
  meanResolutionSeconds: z.number().nullable(),
});
export type TicketReport = z.infer<typeof ticketReportSchema>;

export const crmActivityTrendPointSchema = z.object({
  date: z.string(),
  count: z.number(),
});
export type CrmActivityTrendPoint = z.infer<typeof crmActivityTrendPointSchema>;

export const crmOverviewReportSchema = z.object({
  pipeline: pipelineReportSchema,
  tickets: ticketReportSchema,
  openTasksDueTodayCount: z.number(),
  activityTrend: z.array(crmActivityTrendPointSchema),
});
export type CrmOverviewReport = z.infer<typeof crmOverviewReportSchema>;

export const partnerSearchResultSchema = z.object({
  creatorId: z.string(),
  name: z.string(),
  handle: z.string(),
});

export const customerSearchResultSchema = z.object({
  userId: z.string(),
  name: z.string(),
  handle: z.string(),
});

export const dealSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  value: z.number(),
  status: z.string(),
  stageName: z.string(),
});

export const ticketSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  status: z.string(),
});

export const crmSearchResultsSchema = z.object({
  partners: z.array(partnerSearchResultSchema),
  customers: z.array(customerSearchResultSchema),
  deals: z.array(dealSearchResultSchema),
  tickets: z.array(ticketSearchResultSchema),
});
export type CrmSearchResults = z.infer<typeof crmSearchResultsSchema>;
