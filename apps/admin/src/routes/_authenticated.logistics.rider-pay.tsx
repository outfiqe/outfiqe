import { createFileRoute } from "@tanstack/react-router";

import { RiderPayPage } from "@/features/logistics/rider-pay/components/RiderPayPage";

export const Route = createFileRoute("/_authenticated/logistics/rider-pay")({
  component: RiderPayPage,
});
