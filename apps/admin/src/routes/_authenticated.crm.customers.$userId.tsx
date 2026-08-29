import { createFileRoute } from "@tanstack/react-router";

import { CustomerDetailPage } from "@/features/crm/CustomerDetailPage";

export const Route = createFileRoute("/_authenticated/crm/customers/$userId")({
  component: CustomerDetailPage,
});
