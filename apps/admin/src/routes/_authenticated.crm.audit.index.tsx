import { createFileRoute } from "@tanstack/react-router";

import { AuditPage } from "@/features/crm/AuditPage";

export const Route = createFileRoute("/_authenticated/crm/audit/")({
  component: AuditPage,
});
