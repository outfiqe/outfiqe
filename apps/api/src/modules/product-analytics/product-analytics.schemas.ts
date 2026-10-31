import { z } from "zod";

import {
  INSIGHT_RANGES,
  type InsightRange,
  SPEED_DEVICES,
  SPEED_PAGES,
} from "./insights/insights.constants.js";

const DEFAULT_INSIGHT_RANGE: InsightRange = "30d";

export const insightRangeQuerySchema = z.object({
  range: z.enum(INSIGHT_RANGES).default(DEFAULT_INSIGHT_RANGE),
});

export type InsightRangeQuery = z.infer<typeof insightRangeQuerySchema>;

export const siteSpeedQuerySchema = insightRangeQuerySchema.extend({
  device: z.enum(SPEED_DEVICES).default("all"),
  page: z.enum(SPEED_PAGES).default("all"),
});

export type SiteSpeedQuery = z.infer<typeof siteSpeedQuerySchema>;
