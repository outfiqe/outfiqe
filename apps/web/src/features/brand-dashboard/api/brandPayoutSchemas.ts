import { z } from "zod";

export const brandPayoutSummarySchema = z.object({
  totalPayouts: z.number(),
  pending: z.number(),
  available: z.number(),
  withdrawn: z.number(),
});
export type BrandPayoutSummary = z.infer<typeof brandPayoutSummarySchema>;
