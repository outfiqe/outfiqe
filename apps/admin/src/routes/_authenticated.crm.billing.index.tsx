import { createFileRoute } from "@tanstack/react-router";

import { BillingPage } from "@/features/crm/billing/components/BillingPage";

export const Route = createFileRoute("/_authenticated/crm/billing/")({
  component: BillingPage,
});
