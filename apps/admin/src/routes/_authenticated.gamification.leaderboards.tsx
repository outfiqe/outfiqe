import { createFileRoute } from "@tanstack/react-router";

import { GamificationLeaderboardsPage } from "@/features/gamification/components/GamificationLeaderboardsPage";

export const Route = createFileRoute("/_authenticated/gamification/leaderboards")({
  component: GamificationLeaderboardsPage,
});
