import { createFileRoute } from "@tanstack/react-router";

import { LogisticsAlertsPage } from "@/features/logistics/alerts/components/LogisticsAlertsPage";

export const Route = createFileRoute("/_authenticated/logistics/alerts")({
  component: LogisticsAlertsPage,
});
