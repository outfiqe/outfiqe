import { createFileRoute } from "@tanstack/react-router";

import { RidersPage } from "@/features/logistics/riders/components/RidersPage";

export const Route = createFileRoute("/_authenticated/logistics/riders")({
  component: RidersPage,
});
