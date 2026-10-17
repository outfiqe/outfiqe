import { createFileRoute } from "@tanstack/react-router";

import { BrandReliabilityPage } from "@/features/logistics/reliability/components/BrandReliabilityPage";

export const Route = createFileRoute("/_authenticated/logistics/reliability")({
  component: BrandReliabilityPage,
});
