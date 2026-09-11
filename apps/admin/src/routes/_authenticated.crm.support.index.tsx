import { createFileRoute } from "@tanstack/react-router";

import { TicketsPage } from "@/features/crm/TicketsPage";

export const Route = createFileRoute("/_authenticated/crm/support/")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: TicketsPage,
});
