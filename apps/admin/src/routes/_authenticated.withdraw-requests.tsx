import { createFileRoute } from "@tanstack/react-router";

import { WithdrawRequestsPage } from "@/features/withdraw-requests/WithdrawRequestsPage";

export const Route = createFileRoute("/_authenticated/withdraw-requests")({
  component: WithdrawRequestsPage,
});
