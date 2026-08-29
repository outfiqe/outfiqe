import { createFileRoute } from "@tanstack/react-router";

import { TicketsPage } from "@/features/crm/TicketsPage";

export const Route = createFileRoute("/_authenticated/crm/support/")({
  component: TicketsPage,
});
