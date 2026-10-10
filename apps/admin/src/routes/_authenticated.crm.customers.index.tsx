import { createFileRoute } from "@tanstack/react-router";

import { CustomersPage } from "@/features/crm/relationships/components/CustomersPage";

export const Route = createFileRoute("/_authenticated/crm/customers/")({
  component: CustomersPage,
});
