import { createFileRoute } from "@tanstack/react-router";

import { TagReportsPage } from "@/features/tag-reports/TagReportsPage";

export const Route = createFileRoute("/_authenticated/tag-reports")({
  component: TagReportsPage,
});
