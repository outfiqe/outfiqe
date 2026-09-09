import { apiClient } from "@/lib/apiClient";

import { type TagReviewMetrics, tagReviewMetricsSchema } from "./schemas";

export const tagReviewsApi = {
  async metrics(): Promise<TagReviewMetrics> {
    const res = await apiClient.get<TagReviewMetrics>("/tag-reviews/metrics");
    return tagReviewMetricsSchema.parse(res.data);
  },
};
