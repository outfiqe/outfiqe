import { createFileRoute } from "@tanstack/react-router";

import { ContentReportsPage } from "@/features/content-reports/ContentReportsPage";

export const Route = createFileRoute("/_authenticated/content-reports")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: ContentReportsPage,
});
