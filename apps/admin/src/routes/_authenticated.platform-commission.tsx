import { createFileRoute } from "@tanstack/react-router";

import { PlatformCommissionPage } from "@/features/platform-commission/PlatformCommissionPage";

export const Route = createFileRoute("/_authenticated/platform-commission")({
  component: PlatformCommissionPage,
});
