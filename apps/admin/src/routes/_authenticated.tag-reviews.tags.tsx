import { createFileRoute } from "@tanstack/react-router";

import { TagReviewTagsPage } from "@/features/tag-reviews/components/TagReviewTagsPage";
import { toMetricTagsSearch } from "@/features/tag-reviews/utils/metricTagsSearch.utils";

export const Route = createFileRoute("/_authenticated/tag-reviews/tags")({
  validateSearch: toMetricTagsSearch,
  component: TagReviewTagsPage,
});
