import { createFileRoute } from "@tanstack/react-router";

import { HubsPage } from "@/features/logistics/hubs/components/HubsPage";

export const Route = createFileRoute("/_authenticated/logistics/hubs")({
  component: HubsPage,
});
