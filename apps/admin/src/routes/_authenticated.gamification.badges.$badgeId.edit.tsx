import { createFileRoute } from "@tanstack/react-router";

import { BadgeFormPage } from "@/features/gamification/BadgesSection/BadgeFormPage";

export const Route = createFileRoute("/_authenticated/gamification/badges/$badgeId/edit")({
  component: RouteComponent,
});

function RouteComponent() {
  const { badgeId } = Route.useParams();
  return <BadgeFormPage mode="edit" badgeId={badgeId} />;
}
