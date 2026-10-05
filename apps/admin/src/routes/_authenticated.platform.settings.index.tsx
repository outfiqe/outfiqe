import { createFileRoute } from "@tanstack/react-router";

import { PlatformSettingsPage } from "@/features/platform-settings/PlatformSettingsPage";

export const Route = createFileRoute("/_authenticated/platform/settings/")({
  component: PlatformSettingsPage,
});
