import { createFileRoute } from "@tanstack/react-router";

import { ParcelsPage } from "@/features/logistics/shipments/components/ParcelsPage";

export const Route = createFileRoute("/_authenticated/logistics/parcels/")({
  validateSearch: (search: Record<string, unknown>): { queue?: string } => ({
    queue: typeof search.queue === "string" ? search.queue : undefined,
  }),
  component: ParcelsPage,
});
