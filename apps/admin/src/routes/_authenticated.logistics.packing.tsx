import { createFileRoute } from "@tanstack/react-router";

import { PackingPage } from "@/features/logistics/hub-operations/components/PackingPage";

export const Route = createFileRoute("/_authenticated/logistics/packing")({
  component: PackingPage,
});
