import { createFileRoute } from "@tanstack/react-router";

import { PlatformOverviewPage } from "@/features/platform-metrics/components/PlatformOverviewPage";

export const Route = createFileRoute("/_authenticated/platform/")({
  component: PlatformOverviewPage,
});
