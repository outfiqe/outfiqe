import { createFileRoute } from "@tanstack/react-router";

import { EditBadgePage } from "@/features/gamification/badges/components/BadgeFormPage";

export const Route = createFileRoute("/_authenticated/gamification/badges/$badgeId/edit")({
  component: EditBadgePage,
});
