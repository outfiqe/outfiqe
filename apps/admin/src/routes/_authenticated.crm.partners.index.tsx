import { createFileRoute } from "@tanstack/react-router";

import { PartnersPage } from "@/features/crm/relationships/components/PartnersPage";

export const Route = createFileRoute("/_authenticated/crm/partners/")({
  component: PartnersPage,
});
