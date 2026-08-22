import { createFileRoute } from "@tanstack/react-router";

import { GamificationBadgesPage } from "@/features/gamification/GamificationBadgesPage";

export const Route = createFileRoute("/_authenticated/gamification/badges")({
  component: GamificationBadgesPage,
});
