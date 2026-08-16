import { createFileRoute } from "@tanstack/react-router";

import { OrderFeeSettingsPage } from "@/features/order-fee-settings/OrderFeeSettingsPage";

export const Route = createFileRoute("/_authenticated/order-fee-settings")({
  component: OrderFeeSettingsPage,
});
