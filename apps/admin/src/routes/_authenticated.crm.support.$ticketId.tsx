import { createFileRoute } from "@tanstack/react-router";

import { TicketDetailPage } from "@/features/crm/tickets/components/TicketDetailPage";

export const Route = createFileRoute("/_authenticated/crm/support/$ticketId")({
  component: TicketDetailPage,
});
