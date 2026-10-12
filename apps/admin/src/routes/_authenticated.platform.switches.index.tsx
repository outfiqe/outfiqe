import { createFileRoute } from "@tanstack/react-router";

import { PlatformSwitchesPage } from "@/features/platform-switches/components/PlatformSwitchesPage";

export const Route = createFileRoute("/_authenticated/platform/switches/")({
  component: PlatformSwitchesPage,
});
