import { createFileRoute } from "@tanstack/react-router";

import { OrdersPage } from "@/features/orders/components/OrdersPage";

export const Route = createFileRoute("/_authenticated/orders/")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: OrdersPage,
});
