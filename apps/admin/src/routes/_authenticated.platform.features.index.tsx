import { createFileRoute } from "@tanstack/react-router";

import { PlatformFeaturesPage } from "@/features/platform-features/PlatformFeaturesPage";

export const Route = createFileRoute("/_authenticated/platform/features/")({
  component: PlatformFeaturesPage,
});
