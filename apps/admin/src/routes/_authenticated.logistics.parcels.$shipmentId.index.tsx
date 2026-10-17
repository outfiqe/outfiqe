import { createFileRoute } from "@tanstack/react-router";

import { ParcelDetailPage } from "@/features/logistics/shipments/components/ParcelDetailPage";

export const Route = createFileRoute("/_authenticated/logistics/parcels/$shipmentId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { shipmentId } = Route.useParams();
  return <ParcelDetailPage shipmentId={shipmentId} />;
}
