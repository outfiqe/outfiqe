import { createFileRoute } from "@tanstack/react-router";

import { PlatformAuditPage } from "@/features/platform-audit/components/PlatformAuditPage";

export const Route = createFileRoute("/_authenticated/platform/audit/")({
  component: PlatformAuditPage,
});
