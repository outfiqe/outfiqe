import { createFileRoute } from "@tanstack/react-router";

import { ParcelLabelPrintPage } from "@/features/logistics/shipments/components/ParcelLabelPrintPage";

export const Route = createFileRoute("/_authenticated/logistics/parcels/$shipmentId/label")({
  component: RouteComponent,
});

function RouteComponent() {
  const { shipmentId } = Route.useParams();
  return <ParcelLabelPrintPage shipmentId={shipmentId} />;
}
