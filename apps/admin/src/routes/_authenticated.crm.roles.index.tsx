import { createFileRoute } from "@tanstack/react-router";

import { RolesPage } from "@/features/crm/RolesPage";

export const Route = createFileRoute("/_authenticated/crm/roles/")({
  component: RolesPage,
});
