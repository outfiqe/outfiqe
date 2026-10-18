import { createFileRoute } from "@tanstack/react-router";

import { BagTagSheetPage } from "@/features/logistics/bag-tags/components/BagTagSheetPage";

export const Route = createFileRoute("/_authenticated/logistics/bag-tags/$batchId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { batchId } = Route.useParams();
  return <BagTagSheetPage batchId={batchId} />;
}
