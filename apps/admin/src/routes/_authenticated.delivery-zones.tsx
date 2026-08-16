import { createFileRoute } from "@tanstack/react-router";

import { DeliveryZonesPage } from "@/features/delivery-zones/DeliveryZonesPage";

export const Route = createFileRoute("/_authenticated/delivery-zones")({
  component: DeliveryZonesPage,
});
