import { z } from "zod";

export const brandPayoutSummarySchema = z.object({
  totalPayouts: z.number(),
  pending: z.number(),
  available: z.number(),
  withdrawn: z.number(),
  buildCommissionEarnings: z.number().default(0),
});
export type BrandPayoutSummary = z.infer<typeof brandPayoutSummarySchema>;
