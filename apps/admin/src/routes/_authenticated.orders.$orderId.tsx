import { createFileRoute } from "@tanstack/react-router";

import { OrderDetailPage } from "@/features/orders/OrderDetailPage";

export const Route = createFileRoute("/_authenticated/orders/$orderId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { orderId } = Route.useParams();
  return <OrderDetailPage orderId={orderId} />;
}
