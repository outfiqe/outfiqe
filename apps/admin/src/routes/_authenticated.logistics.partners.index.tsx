import { createFileRoute } from "@tanstack/react-router";

import { PartnersPage } from "@/features/logistics/partners/components/PartnersPage";

export const Route = createFileRoute("/_authenticated/logistics/partners/")({
  component: PartnersPage,
});
