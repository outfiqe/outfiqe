import { createFileRoute } from "@tanstack/react-router";

import { BankAccountsPage } from "@/features/bank-accounts/BankAccountsPage";

export const Route = createFileRoute("/_authenticated/bank-accounts")({
  validateSearch: (search: Record<string, unknown>): { owner?: string; verified?: string } => ({
    owner: typeof search.owner === "string" ? search.owner : undefined,
    verified: typeof search.verified === "string" ? search.verified : undefined,
  }),
  component: BankAccountsPage,
});
