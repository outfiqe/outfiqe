import { createFileRoute } from "@tanstack/react-router";

import { TagReviewMetricsPage } from "@/features/tag-reviews/components/TagReviewMetricsPage";

export const Route = createFileRoute("/_authenticated/tag-reviews")({
  component: TagReviewMetricsPage,
});
