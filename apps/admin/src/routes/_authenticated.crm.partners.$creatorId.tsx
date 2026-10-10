import { createFileRoute } from "@tanstack/react-router";

import { PartnerDetailPage } from "@/features/crm/relationships/components/PartnerDetailPage";

export const Route = createFileRoute("/_authenticated/crm/partners/$creatorId")({
  component: PartnerDetailPage,
});
