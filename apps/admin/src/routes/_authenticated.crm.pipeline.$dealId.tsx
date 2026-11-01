import { createFileRoute } from "@tanstack/react-router";

import { DealDetailPage } from "@/features/crm/pipeline/components/DealDetailPage";

export const Route = createFileRoute("/_authenticated/crm/pipeline/$dealId")({
  component: DealDetailPage,
});
