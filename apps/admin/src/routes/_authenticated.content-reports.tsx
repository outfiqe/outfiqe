import { createFileRoute } from "@tanstack/react-router";

import { ContentReportsPage } from "@/features/content-reports/ContentReportsPage";

export const Route = createFileRoute("/_authenticated/content-reports")({
  component: ContentReportsPage,
});
