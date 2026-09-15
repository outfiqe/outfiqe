import { createFileRoute } from "@tanstack/react-router";

import { CommissionsPage } from "@/features/commissions/CommissionsPage";

export const Route = createFileRoute("/_authenticated/commissions")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: CommissionsPage,
});
