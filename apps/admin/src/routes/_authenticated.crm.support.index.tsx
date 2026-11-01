import { createFileRoute } from "@tanstack/react-router";

import { TicketsPage } from "@/features/crm/tickets/components/TicketsPage";

type SupportListSearch = { status?: string; assignee?: string; from?: string; to?: string };

const readSearchText = (value: unknown) => (typeof value === "string" ? value : undefined);

export const Route = createFileRoute("/_authenticated/crm/support/")({
  validateSearch: (search: Record<string, unknown>): SupportListSearch => ({
    status: readSearchText(search.status),
    assignee: readSearchText(search.assignee),
    from: readSearchText(search.from),
    to: readSearchText(search.to),
  }),
  component: TicketsPage,
});
