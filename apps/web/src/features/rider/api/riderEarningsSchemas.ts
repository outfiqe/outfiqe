import { z } from "zod";

export const RIDER_EARNING_STATUSES = ["PENDING", "AVAILABLE", "WITHDRAWN", "VOIDED"] as const;
export type RiderEarningStatus = (typeof RIDER_EARNING_STATUSES)[number];

export const RIDER_EARNING_KINDS = ["VISIT", "WASTED_VISIT"] as const;
export type RiderEarningKind = (typeof RIDER_EARNING_KINDS)[number];

export const riderEarningSchema = z.object({
  id: z.string(),
  brandName: z.string(),
  pickupLocationLabel: z.string(),
  kind: z.enum(RIDER_EARNING_KINDS),
  currency: z.string(),
  stopCount: z.number(),
  amount: z.number(),
  status: z.enum(RIDER_EARNING_STATUSES),
  earnedAt: z.string(),
  releasesAt: z.string(),
  voidReason: z.string().nullable(),
});
export type RiderEarning = z.infer<typeof riderEarningSchema>;

export const riderEarningsSummarySchema = z.object({
  currency: z.string(),
  pendingAmount: z.number(),
  availableAmount: z.number(),
  withdrawnAmount: z.number(),
});
export type RiderEarningsSummary = z.infer<typeof riderEarningsSummarySchema>;

export const riderEarningsPageSchema = z.object({
  summary: riderEarningsSummarySchema,
  items: z.array(riderEarningSchema),
  nextCursor: z.string().nullable(),
});
export type RiderEarningsPage = z.infer<typeof riderEarningsPageSchema>;
