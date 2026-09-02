import { createFileRoute } from "@tanstack/react-router";

import { CrmInviteRegisterPage } from "@/features/crm/CrmInviteRegisterPage";

export const Route = createFileRoute("/crm/invites/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: CrmInviteRegisterPage,
});
