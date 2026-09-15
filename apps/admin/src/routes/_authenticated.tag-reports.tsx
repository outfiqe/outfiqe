import { createFileRoute } from "@tanstack/react-router";

import { TagReportsPage } from "@/features/tag-reports/TagReportsPage";

export const Route = createFileRoute("/_authenticated/tag-reports")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: TagReportsPage,
});
