import { createFileRoute } from "@tanstack/react-router";

import { PlatformSettingsPage } from "@/features/platform-settings/components/PlatformSettingsPage";

export const Route = createFileRoute("/_authenticated/platform/settings/")({
  component: PlatformSettingsPage,
});
