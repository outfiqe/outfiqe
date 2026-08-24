import { createFileRoute } from "@tanstack/react-router";

import { WithdrawPolicyPage } from "@/features/withdraw-policy/WithdrawPolicyPage";

export const Route = createFileRoute("/_authenticated/withdraw-policy")({
  component: WithdrawPolicyPage,
});
