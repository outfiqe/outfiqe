import { createFileRoute } from "@tanstack/react-router";

import { AcceptInvitePage } from "@/features/crm/AcceptInvitePage";

export const Route = createFileRoute("/_authenticated/crm/invites/accept")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: AcceptInvitePage,
});
