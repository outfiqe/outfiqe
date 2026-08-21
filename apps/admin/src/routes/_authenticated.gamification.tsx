import { createFileRoute } from "@tanstack/react-router";

import { GamificationPage } from "@/features/gamification/GamificationPage";

export const Route = createFileRoute("/_authenticated/gamification")({
  component: GamificationPage,
});
