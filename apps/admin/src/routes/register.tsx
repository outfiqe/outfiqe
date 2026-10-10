import { createFileRoute } from "@tanstack/react-router";

import { RegisterInvitePage } from "@/features/auth/components/RegisterInvitePage";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: RegisterInvitePage,
});
