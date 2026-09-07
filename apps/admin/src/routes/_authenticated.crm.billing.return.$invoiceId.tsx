import { createFileRoute } from "@tanstack/react-router";

import { BillingReturnPage } from "@/features/crm/BillingReturnPage";

export const Route = createFileRoute("/_authenticated/crm/billing/return/$invoiceId")({
  component: BillingReturnPage,
});
