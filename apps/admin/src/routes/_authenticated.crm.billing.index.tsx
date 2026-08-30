import { createFileRoute } from "@tanstack/react-router";

import { BillingPage } from "@/features/crm/BillingPage";

export const Route = createFileRoute("/_authenticated/crm/billing/")({
  component: BillingPage,
});
