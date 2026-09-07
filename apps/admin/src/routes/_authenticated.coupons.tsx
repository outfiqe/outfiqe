import { createFileRoute } from "@tanstack/react-router";

import { CouponsPage } from "@/features/coupons/CouponsPage";

export const Route = createFileRoute("/_authenticated/coupons")({
  component: CouponsPage,
});
