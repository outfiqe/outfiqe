import { createFileRoute } from "@tanstack/react-router";

import { PlatformNavAccessPage } from "@/features/platform-nav-access/PlatformNavAccessPage";

export const Route = createFileRoute("/_authenticated/platform/nav-access/")({
  component: PlatformNavAccessPage,
});
