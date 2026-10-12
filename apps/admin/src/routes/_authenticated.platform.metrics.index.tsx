import { createFileRoute } from "@tanstack/react-router";

import { PlatformMetricsPage } from "@/features/platform-metrics/components/PlatformMetricsPage";

export const Route = createFileRoute("/_authenticated/platform/metrics/")({
  component: PlatformMetricsPage,
});
