import { z } from "zod";

import { INSIGHT_RANGES, type InsightRange } from "./insights/insights.constants.js";

const DEFAULT_INSIGHT_RANGE: InsightRange = "30d";

export const insightRangeQuerySchema = z.object({
  range: z.enum(INSIGHT_RANGES).default(DEFAULT_INSIGHT_RANGE),
});

export type InsightRangeQuery = z.infer<typeof insightRangeQuerySchema>;
