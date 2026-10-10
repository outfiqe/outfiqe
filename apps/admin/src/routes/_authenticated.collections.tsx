import { createFileRoute } from "@tanstack/react-router";

import { CollectionsPage } from "@/features/collections/components/CollectionsPage";

export const Route = createFileRoute("/_authenticated/collections")({
  component: CollectionsPage,
});
