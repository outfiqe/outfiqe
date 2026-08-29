import { createFileRoute } from "@tanstack/react-router";

import { BillingReturnPage } from "@/features/crm/BillingReturnPage";

export const Route = createFileRoute("/_authenticated/crm/billing/return")({
  validateSearch: (search: Record<string, unknown>) => ({
    invoiceId: typeof search.invoiceId === "string" ? search.invoiceId : "",
  }),
  component: BillingReturnPage,
});
