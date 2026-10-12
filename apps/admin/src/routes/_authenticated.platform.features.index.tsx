import { createFileRoute } from "@tanstack/react-router";

import { PlatformFeaturesPage } from "@/features/platform-features/components/PlatformFeaturesPage";

export const Route = createFileRoute("/_authenticated/platform/features/")({
  component: PlatformFeaturesPage,
});
