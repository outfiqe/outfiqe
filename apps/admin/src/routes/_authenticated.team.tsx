import { createFileRoute } from "@tanstack/react-router";

import { TeamPage } from "@/features/team/TeamPage";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
});
