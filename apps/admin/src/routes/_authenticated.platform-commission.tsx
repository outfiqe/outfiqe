import { createFileRoute } from "@tanstack/react-router";

import { PlatformCommissionPage } from "@/features/platform-commission/components/PlatformCommissionPage";

export const Route = createFileRoute("/_authenticated/platform-commission")({
  component: PlatformCommissionPage,
});
