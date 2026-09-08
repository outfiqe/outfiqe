import { createFileRoute } from "@tanstack/react-router";

import { TagReviewMetricsPage } from "@/features/tag-reviews/TagReviewMetricsPage";

export const Route = createFileRoute("/_authenticated/tag-reviews")({
  component: TagReviewMetricsPage,
});
