import { createFileRoute } from "@tanstack/react-router";

import { BadgeDesignStudioPage } from "@/features/gamification/BadgesSection/DesignStudio/BadgeDesignStudioPage";

export const Route = createFileRoute("/_authenticated/gamification/badges/design-studio")({
  component: BadgeDesignStudioPage,
});
