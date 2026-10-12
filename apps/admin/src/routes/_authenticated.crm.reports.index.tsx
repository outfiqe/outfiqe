import { createFileRoute } from "@tanstack/react-router";

import { ReportsPage } from "@/features/crm/reporting/components/ReportsPage";

export const Route = createFileRoute("/_authenticated/crm/reports/")({
  component: ReportsPage,
});
