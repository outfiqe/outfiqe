import { createFileRoute } from "@tanstack/react-router";

import { PlatformSwitchesPage } from "@/features/platform-switches/PlatformSwitchesPage";

export const Route = createFileRoute("/_authenticated/platform/switches/")({
  component: PlatformSwitchesPage,
});
