import type { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import type { AnalyticsRange } from "../constants/platformAnalytics.constants";
import {
  acquisitionResultSchema,
  lookToOrderResultSchema,
  overviewResultSchema,
  purchaseFunnelResultSchema,
  retentionResultSchema,
  siteSpeedResultSchema,
  siteTrafficResultSchema,
  zeroResultSearchesResultSchema,
} from "./platformAnalyticsSchemas";

const getInsight = async <ResultSchema extends z.ZodType>(
  insightPath: string,
  range: AnalyticsRange,
  resultSchema: ResultSchema,
): Promise<z.infer<ResultSchema>> => {
  const res = await apiClient.get<unknown>(`/platform/analytics/${insightPath}`, {
    params: { range },
  });
  return resultSchema.parse(res.data);
};

export const platformAnalyticsApi = {
  getOverview: (range: AnalyticsRange) => getInsight("overview", range, overviewResultSchema),
  getPurchaseFunnel: (range: AnalyticsRange) =>
    getInsight("funnels/purchase", range, purchaseFunnelResultSchema),
  getLookToOrder: (range: AnalyticsRange) =>
    getInsight("funnels/look-to-order", range, lookToOrderResultSchema),
  getAcquisition: (range: AnalyticsRange) =>
    getInsight("acquisition", range, acquisitionResultSchema),
  getRetention: (range: AnalyticsRange) => getInsight("retention", range, retentionResultSchema),
  getZeroResultSearches: (range: AnalyticsRange) =>
    getInsight("search/zero-results", range, zeroResultSearchesResultSchema),
  getSiteTraffic: (range: AnalyticsRange) => getInsight("traffic", range, siteTrafficResultSchema),
  getSiteSpeed: (range: AnalyticsRange) => getInsight("speed", range, siteSpeedResultSchema),
};
