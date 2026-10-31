import { z } from "zod";

const SHORT_PERIOD_DAYS = 7;
const DEFAULT_PERIOD_DAYS = 30;
const LONG_PERIOD_DAYS = 90;

export const overviewPeriodQuerySchema = z.object({
  days: z.coerce
    .number()
    .pipe(
      z.union([
        z.literal(SHORT_PERIOD_DAYS),
        z.literal(DEFAULT_PERIOD_DAYS),
        z.literal(LONG_PERIOD_DAYS),
      ]),
    )
    .default(DEFAULT_PERIOD_DAYS),
});

export type OverviewPeriodQuery = z.infer<typeof overviewPeriodQuerySchema>;
