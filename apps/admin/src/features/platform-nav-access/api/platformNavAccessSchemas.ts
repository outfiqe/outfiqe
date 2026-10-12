import { z } from "zod";

export const coFounderSummarySchema = z.object({
  membershipId: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
});
export type CoFounderSummary = z.infer<typeof coFounderSummarySchema>;

export const navAccessOverviewSchema = z.object({
  isCoFounder: z.boolean(),
  hiddenNavKeys: z.array(z.string()),
  coFounders: z.array(coFounderSummarySchema),
});
export type NavAccessOverview = z.infer<typeof navAccessOverviewSchema>;

export const savedHiddenNavKeysSchema = z.object({
  hiddenNavKeys: z.array(z.string()),
});
