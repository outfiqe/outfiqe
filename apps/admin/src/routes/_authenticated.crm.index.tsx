import { createFileRoute } from "@tanstack/react-router";

import { CrmPage } from "@/features/crm/components/CrmPage";

export const Route = createFileRoute("/_authenticated/crm/")({
  component: CrmPage,
});
