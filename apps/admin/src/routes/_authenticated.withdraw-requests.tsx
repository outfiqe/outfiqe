import { createFileRoute } from "@tanstack/react-router";

import { WithdrawRequestsPage } from "@/features/withdraw-requests/WithdrawRequestsPage";

export const Route = createFileRoute("/_authenticated/withdraw-requests")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: WithdrawRequestsPage,
});
