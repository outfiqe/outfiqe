import { createFileRoute } from "@tanstack/react-router";

import { EditBadgePage } from "@/features/gamification/BadgesSection/BadgeFormPage";

export const Route = createFileRoute("/_authenticated/gamification/badges/$badgeId/edit")({
  component: EditBadgePage,
});
