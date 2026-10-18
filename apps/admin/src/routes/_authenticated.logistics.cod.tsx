import { createFileRoute } from "@tanstack/react-router";

import { CodPage } from "@/features/logistics/cod/components/CodPage";

export const Route = createFileRoute("/_authenticated/logistics/cod")({
  component: CodPage,
});
