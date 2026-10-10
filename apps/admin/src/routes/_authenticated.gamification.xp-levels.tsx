import { createFileRoute } from "@tanstack/react-router";

import { GamificationXpLevelsPage } from "@/features/gamification/components/GamificationXpLevelsPage";

export const Route = createFileRoute("/_authenticated/gamification/xp-levels")({
  component: GamificationXpLevelsPage,
});
