import { z } from "zod";

import { creatorCommissionSchema } from "./commissionSchemas";

export const creatorOverviewKpisSchema = z.object({
  totalEarnings: z.number(),
  pendingEarnings: z.number(),
  availableEarnings: z.number(),
  last30DaysEarnings: z.number(),
  previous30DaysEarnings: z.number(),
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

export const creatorOverviewSchema = z.object({
  kpis: creatorOverviewKpisSchema,
  trend: z.array(creatorOverviewTrendPointSchema),
  recentCommissions: z.array(creatorCommissionSchema),
});
export type CreatorOverview = z.infer<typeof creatorOverviewSchema>;
