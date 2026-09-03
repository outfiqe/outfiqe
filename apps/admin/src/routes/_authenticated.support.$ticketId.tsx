import { createFileRoute } from "@tanstack/react-router";

import { SupportTicketPage } from "@/features/support";

export const Route = createFileRoute("/_authenticated/support/$ticketId")({
  component: SupportTicketPage,
});
