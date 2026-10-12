import { createFileRoute } from "@tanstack/react-router";

import { GamificationManualActionsPage } from "@/features/gamification/components/GamificationManualActionsPage";

export const Route = createFileRoute("/_authenticated/gamification/manual-actions")({
  component: GamificationManualActionsPage,
});
