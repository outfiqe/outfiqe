import { createFileRoute } from "@tanstack/react-router";

import { GamificationOverviewPage } from "@/features/gamification/components/GamificationOverviewPage";

export const Route = createFileRoute("/_authenticated/gamification/")({
  component: GamificationOverviewPage,
});
