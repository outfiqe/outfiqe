import { createFileRoute } from "@tanstack/react-router";

import { UnavailableItemsPage } from "@/features/orders/unavailable-items/components/UnavailableItemsPage";

export const Route = createFileRoute("/_authenticated/orders/unavailable-items")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: UnavailableItemsPage,
});
