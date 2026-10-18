import { createFileRoute } from "@tanstack/react-router";

import { RefundQueuePage } from "@/features/orders/refunds/components/RefundQueuePage";

export const Route = createFileRoute("/_authenticated/orders/refunds")({
  component: RefundQueuePage,
});
