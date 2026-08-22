import { createFileRoute } from "@tanstack/react-router";

import { GamificationXpLevelsPage } from "@/features/gamification/GamificationXpLevelsPage";

export const Route = createFileRoute("/_authenticated/gamification/xp-levels")({
  component: GamificationXpLevelsPage,
});
