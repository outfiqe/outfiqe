import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { tagReviewsApi } from "../api/tagReviewsApi";
import type { MetricTagsSearch } from "../constants/metricTagViews.constants";

export const useInfiniteMetricTags = (search: MetricTagsSearch) =>
  useInfiniteCursorPage(["tag-review-metric-tags", search], (cursor) =>
    tagReviewsApi.metricTags(search, cursor),
  );
