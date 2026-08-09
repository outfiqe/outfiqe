import { createFileRoute } from "@tanstack/react-router";

import { BrandApplicationsPage } from "@/features/brand-applications/BrandApplicationsPage";

export const Route = createFileRoute("/_authenticated/")({
  component: BrandApplicationsPage,
});
