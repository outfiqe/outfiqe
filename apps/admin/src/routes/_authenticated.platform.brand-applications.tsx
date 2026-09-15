import { createFileRoute } from "@tanstack/react-router";

import { BrandApplicationsPage } from "@/features/brand-applications/BrandApplicationsPage";

export const Route = createFileRoute("/_authenticated/platform/brand-applications")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: BrandApplicationsPage,
});
