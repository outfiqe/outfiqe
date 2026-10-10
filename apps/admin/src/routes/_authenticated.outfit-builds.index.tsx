import { createFileRoute } from "@tanstack/react-router";

import { OutfitBuildsPage } from "@/features/outfit-builds/components/OutfitBuildsPage";

export const Route = createFileRoute("/_authenticated/outfit-builds/")({
  component: OutfitBuildsPage,
});
