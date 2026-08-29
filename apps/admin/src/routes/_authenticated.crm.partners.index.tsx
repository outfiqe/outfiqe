import { createFileRoute } from "@tanstack/react-router";

import { PartnersPage } from "@/features/crm/PartnersPage";

export const Route = createFileRoute("/_authenticated/crm/partners/")({
  component: PartnersPage,
});
