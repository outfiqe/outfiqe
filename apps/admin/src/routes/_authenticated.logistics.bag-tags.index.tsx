import { createFileRoute } from "@tanstack/react-router";

import { BagTagsPage } from "@/features/logistics/bag-tags/components/BagTagsPage";

export const Route = createFileRoute("/_authenticated/logistics/bag-tags/")({
  component: BagTagsPage,
});
