import { createFileRoute } from "@tanstack/react-router";

import { BadgeFormPage } from "@/features/gamification/BadgesSection/BadgeFormPage";

export const Route = createFileRoute("/_authenticated/gamification/badges/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    duplicateFrom: typeof search.duplicateFrom === "string" ? search.duplicateFrom : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { duplicateFrom } = Route.useSearch();
  return <BadgeFormPage mode="create" duplicateFromId={duplicateFrom} />;
}
