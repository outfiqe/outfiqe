import { createFileRoute } from "@tanstack/react-router";

import { CommissionsPage } from "@/features/commissions/CommissionsPage";

export const Route = createFileRoute("/_authenticated/commissions")({
  component: CommissionsPage,
});
