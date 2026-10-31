import { z } from "zod";

import { creatorCommissionSchema } from "../earnings/api/commissionSchemas";

export const creatorOverviewKpisSchema = z.object({
  totalEarnings: z.number(),
  pendingEarnings: z.number(),
  availableEarnings: z.number(),
  periodDays: z.number(),
  periodEarnings: z.number(),
  previousPeriodEarnings: z.number(),
  lookCount: z.number(),
  followerCount: z.number(),
  totalLikes: z.number(),
});
export type CreatorOverviewKpis = z.infer<typeof creatorOverviewKpisSchema>;

export const creatorOverviewTrendPointSchema = z.object({
  date: z.string(),
  earnings: z.number(),
  cumulativeEarnings: z.number(),
  looks: z.number(),
});
export type CreatorOverviewTrendPoint = z.infer<typeof creatorOverviewTrendPointSchema>;

const creatorTopLookSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  caption: z.string().nullable(),
  likeCount: z.number(),
  salesCount: z.number(),
  earnings: z.number(),
});

const creatorEarningsBySourceSchema = z.object({
  source: z.string(),
  earnings: z.number(),
  salesCount: z.number(),
});

export const creatorOverviewSchema = z.object({
  kpis: creatorOverviewKpisSchema,
  trend: z.array(creatorOverviewTrendPointSchema),
  handle: z.string(),
  nextAvailableAt: z.string().nullable(),
  topLooks: z.array(creatorTopLookSchema),
  earningsBySource: z.array(creatorEarningsBySourceSchema),
  recentCommissions: z.array(creatorCommissionSchema),
});
export type CreatorOverview = z.infer<typeof creatorOverviewSchema>;
