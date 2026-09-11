import { createFileRoute } from "@tanstack/react-router";

import { CouponsPage } from "@/features/coupons/CouponsPage";

export const Route = createFileRoute("/_authenticated/coupons")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: CouponsPage,
});
