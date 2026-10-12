import { createFileRoute } from "@tanstack/react-router";

import { TeamPage } from "@/features/team/components/TeamPage";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
});
