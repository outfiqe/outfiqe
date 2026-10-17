import { createFileRoute } from "@tanstack/react-router";

import { PartnerDetailPage } from "@/features/logistics/partners/components/PartnerDetailPage";

export const Route = createFileRoute("/_authenticated/logistics/partners/$partnerId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { partnerId } = Route.useParams();
  return <PartnerDetailPage partnerId={partnerId} />;
}
