import { createFileRoute } from "@tanstack/react-router";

import { GamificationLeaderboardsPage } from "@/features/gamification/GamificationLeaderboardsPage";

export const Route = createFileRoute("/_authenticated/gamification/leaderboards")({
  component: GamificationLeaderboardsPage,
});
