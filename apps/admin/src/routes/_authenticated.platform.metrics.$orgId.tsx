import { createFileRoute } from "@tanstack/react-router";

import { TenantMetricsDetailPage } from "@/features/platform-metrics/TenantMetricsDetailPage";

export const Route = createFileRoute("/_authenticated/platform/metrics/$orgId")({
  component: TenantMetricsDetailPage,
});
