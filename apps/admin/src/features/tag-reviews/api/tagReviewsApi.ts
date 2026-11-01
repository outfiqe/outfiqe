import { apiClient } from "@/lib/apiClient";

import type { MetricTagsSearch } from "../constants/metricTagViews.constants";
import {
  type MetricTagPage,
  metricTagPageSchema,
  type TagReviewMetrics,
  tagReviewMetricsSchema,
} from "./tagReviewsSchemas";

export const tagReviewsApi = {
  async metrics(): Promise<TagReviewMetrics> {
    const res = await apiClient.get<TagReviewMetrics>("/tag-reviews/metrics");
    return tagReviewMetricsSchema.parse(res.data);
  },

  async metricTags(
    { view, source, reason, policy }: MetricTagsSearch,
    cursor?: string,
  ): Promise<MetricTagPage> {
    const params = new URLSearchParams({ view });
    if (source) params.set("source", source);
    if (reason) params.set("reason", reason);
    if (policy) params.set("policy", policy);
    if (cursor) params.set("cursor", cursor);
    const res = await apiClient.get<MetricTagPage>(`/tag-reviews/metrics/tags?${params}`);
    return metricTagPageSchema.parse(res.data);
  },
};
