import { createFileRoute } from "@tanstack/react-router";

import { CustomersPage } from "@/features/crm/CustomersPage";

export const Route = createFileRoute("/_authenticated/crm/customers/")({
  component: CustomersPage,
});
