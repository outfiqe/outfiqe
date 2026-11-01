import { createFileRoute } from "@tanstack/react-router";

import { PlatformAnalyticsPage } from "@/features/platform-analytics/components/PlatformAnalyticsPage";

export const Route = createFileRoute("/_authenticated/platform/analytics/")({
  component: PlatformAnalyticsPage,
});
